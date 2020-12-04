cm.to.in <- function(x) {
  y=x/2.54;
  y;
}



prepareMeasureData <- function(measure) {
  
  filter = Filter(is.factor, measure);
  ## functions that apply to all factors, case fix, rm quotes, correct NA, change equal to both
  lowerCaseFactors = as.data.frame(lapply(filter, tolower));
  lowerCaseFactors = as.data.frame (sapply (lowerCaseFactors, function (x) gsub ("\"", "", x)))
  lowerCaseFactors$notes = as.factor(lowerCaseFactors$notes);
  
  lowerCaseFactors = as.data.frame (sapply (lowerCaseFactors, function (x) gsub ("equal", "both", x)))
  ## stepwise through the variables list
  #units abbreviated as cm and in only
  lowerCaseFactors$units = as.factor(gsub("ches", "", lowerCaseFactors$units))
  lowerCaseFactors$units = as.factor(gsub("ch", "", lowerCaseFactors$units))
  #gender written only as lowercase full word #non-binary is single obeservation, already written out
  lowerCaseFactors$gender = recode(lowerCaseFactors$gender, f = "female", m = "male");
  # replacing the weird n/a with NA in side
  lowerCaseFactors$side = as.factor(gsub ("n/a", "NA", lowerCaseFactors$side));
  #make combo eye color consistent
  lowerCaseFactors$eye_color = as.factor(gsub ("-", "/", lowerCaseFactors$eye_color));
  #correct mispellings in swinging sides
  lowerCaseFactors$swinging = as.factor(gsub ("leftt", "left", lowerCaseFactors$swinging));
  lowerCaseFactors$swinging = as.factor(gsub ("let", "left", lowerCaseFactors$swinging));
  lowerCaseFactors$swinging = as.factor(gsub ("rigth", "right", lowerCaseFactors$swinging));
  #correct misspellings in ethnicity
  lowerCaseFactors$ethnicity = as.factor(gsub ("asain", "asian", lowerCaseFactors$ethnicity));
  lowerCaseFactors$ethnicity = as.factor(gsub ("white", "caucasian", lowerCaseFactors$ethnicity));
  lowerCaseFactors$ethnicity = as.factor(gsub ("caucasian non-hispanic", "caucasian", lowerCaseFactors$ethnicity));
  lowerCaseFactors$ethnicity = as.factor(gsub ("caucasian italian", "caucasian", lowerCaseFactors$ethnicity));
  ## Assuming that the eye color and dominance for person 87 were just switched
  miscolor= lowerCaseFactors$eye[87];
  misdomeye = lowerCaseFactors$eye_color[87];
  lowerCaseFactors$eye[87] = misdomeye;
  lowerCaseFactors$eye_color[87] = miscolor;
  ##fix mislabeled units
  lowerCaseFactors$units[336] = c("cm") ;
  
  
  measure = measure[, -which(names(measure) %in% names(filter))];
  measure = as.data.frame(cbind(lowerCaseFactors, measure));
  
  ##convert cm to in
  
  nums = as.data.frame(measure[,c(4,12:34)]);
  nums$units = as.character(nums$units)
 
   convertMeasures <- function(nums) {
    nscan = length(nums$units);
    num.cols = ncol(nums);
    for(i in 1:nscan){
      if(nums$units[i] == "cm"){
        nums[i,c(2:num.cols)] = cm.to.in(nums[i, c(2:num.cols)]);
      }
    }
    nums;
  }
  
  nums.new = convertMeasures(nums);
  

  measure = measure[, -which(names(measure) %in% names(nums.new))]
  measure = as.data.frame(cbind(measure, nums.new));
  
  measure$units = as.factor(gsub("cm", "in", measure$units));
  
  measure = unique(measure);
  measure = measure[unique(measure$person_id),];
  
  #data collapsing
  measure$hand.length = (measure$hand.length.left + measure$hand.length.right)/2;
  measure$hand.width = (measure$hand.width.left + measure$hand.width.right)/2;
  measure$floor.armpit = (measure$floor.armpit.left + measure$floor.armpit.right)/2;
  measure$hand.elbow = (measure$hand.elbow.left +measure$hand.elbow.right)/2;
  measure$elbow.armpit = (measure$elbow.armpit.left+ measure$elbow.armpit.right)/2;
  measure$floor.kneepit = (measure$floor.kneepit.left+measure$floor.kneepit.right)/2;
  measure$floor.hip = (measure$floor.hip.left+measure$floor.hip.right)/2;
  measure$arm.reach = (measure$arm.reach.left + measure$arm.reach.right)/2;
  measure$foot.length = (measure$foot.length.left+measure$foot.length.right)/2;
  
  measure = measure[complete.cases(measure$arm.span.NA),];
  measure = measure[complete.cases(measure$height.NA),];
  
  
  measure$ape.index = measure$arm.span.NA - measure$height.NA;
  
  
  
  measure;
}

summarizeMeanSD = function(measure.collapsed) {
  names = colnames(measure.collapsed);
  n = length(measure.collapsed);
  summary = data.frame();
  for(i in 1:n) {
    summary[1,i] = round( mean(measure.collapsed[,i], na.rm = T), 1);
    summary[2,i] = round( sd(measure.collapsed[,i], na.rm = T), 2);
  }
  colnames(summary)= names;
  rownames(summary) = c("mean", "standard deviation");
  summary;
}
