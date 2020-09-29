## LECTURE 3
##419 03 n greater one

library(rvest)
library(stringr)

##functions

education = function(one)
  {
  result = list();
    result$who = one;
    result$think = c("intensively", "critically");
    result$goal = "intelligence + character";
  result;
  }

me = education("monte");

#homework will be matrix manipulation

rotateMatrix90 = function(mat)
{
  mat <- t(mat);
  id <- matrix(c(0,0,1,0,1,0,1,0,0), nrow=3, ncol=3,byrow=T);
  mat <- mat %*% id;
  return(mat);
}

rotateMatrix180 = function(mat)
{
  mat <- rotateMatrix90(mat);
  rotateMatrix90(mat);
}

rotateMatrix270 = function(mat)
{
  mat <- rotateMatrix180(mat);
  rotateMatrix90(mat);
}

