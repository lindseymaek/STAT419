doSummary = function(x, first.var, var.type, md5) {
  out = matrix(nrow= 9, ncol = 60);
  user = filter(x, md5_email == md5)
  count = 1;
  
  for(i in first.var:ncol(x)){
    out[1,count] = nrow(x); # length
    out[2,count] = sum(is.na(x[,i])); # num.NA
    out[3,count] = mean(x[,i]); # mean
    out[4,count] = median(x[,i]); # median
    out[5,count] = doMode(x[,i]); #mode
    out[6,count] = sd(x[,i]); #sd
    if(var.type == "varN") {
      out[7,count] = doSampleVariance(x[,i], method = "naive") 
    } else if(var.type == "var2") {
      out[7,count] = doSampleVariance(x[,i], method = "2pass")
    }
    out[8,count] = user[,i]; #user obs
    out[9, count] = as.numeric(((user[,i]-mean(x[,i])) / sd(x[,i]))); #z-score
    count = count +1;
  }
  out = as.data.frame(out);
  out$names = c("length","NA Count","mean","median","mode","sd","variance","user", "z-score");
  out = column_to_rownames(out, var = "names");
  return(out);
}

doSampleVariance = function(x, method)
{
  if(method=="naive"){
    sum = 0;
    sumsq = 0;
    
    for(i in 1:length(x)){
      sum = sum + x[i];
      sumsq = sumsq+x[i]*x[i];
    }
    var = (sumsq - (sum*sum)/length(x)) / (length(x)-1);
    return(var);
  }
  else if(method == "2pass") {
    sum =0
    for(i in 1:length(x)){
      sum = sum + (x[i]-mean(x))^2;
    }
    var = sum/(length(x)-1);
    return(var);
  }
  
}


doMode = function(x)
{
  x = sort(x, decreasing = F);
  u = unique(x);
  myfreq = as.data.frame(table(x));
  nx = length(x);
  count = 1;
  place = 1;
  out = matrix(nrow= nx, ncol = 2);
  out[1,1] = x[1];
  out[1,2] = 1; 
  
  for(i in 2:nx){
    
    if(x[i]==x[i-1]){
      count = count +1; 
      out[place,2] = count; 
    } else {
      place = place +1;
      count = 1;
      out[place,1] = x[i];
      out[place,2] = count; 
    }
    
  }
  out = data.frame(out);
  out = na.omit(out);
  out= out[with(out, order(out[,2], decreasing = T)), ]
  mode = out[1,1];
  return(mode);
}