#Set working directory
# setwd("") 
df = read.csv('responses-ranking.csv')

#Exclude the participants who self-reported color deficiency 
df = df[df$vision_deficiency=='no',];
#Exclude the 3 who got accuracies lower than chance (<0.5)
df = df[df$userID != '1AVKB4qzGsd4735GM4P4fxVnNCn1' & df$userID !='6RE8zGtYM5UnUwRmKtsT787u3u63' & df$userID !='QRG6gODqk8cfyP3q8khiEXzpD5z2',];

df = df[,c("rank.elaborate", "rank.simple", "rank.baseline", "rank.static", "agg", "treatment")]
set.seed(123)  # to make the results reproducible

possible.ns <- seq(from=50, to=100, by=10)     # The sample sizes we'll be considering
alpha <- 0.05                                    # Standard significance level
sims <- 1000                               # Number of simulations to conduct for each N

agg = 'count'  #change to compute power for different aggs
staged_anim_effect = 2.0 #compute power for each test assuming observed staged animations' sd and non staged animations' sd, and mean for staged animations which is staged_anim_effect more than mean of average non-staged animations

print(paste("Agg", agg))

#calculate sds and mean 
mydata <- df[df$agg == agg,]
mean <- mean(c(mydata$rank.static, mydata$rank.baseline))
sd <- sd(c(mydata$rank.static, mydata$rank.baseline))
staged_anim_mean <- mean - staged_anim_effect
staged_anim_sd <- sd(c(mydata$rank.elaborate, mydata$rank.simple))


#will find power for seeing at least a significant friendman test, and at least n significant posthoc comparison, at lesat two significant post hoc comparisons, etc
#only posthoc comparisons we care about are the ones that compare staged animations to others
results <- data.frame(condition= c("result"))
results.posthoc <- vector(length=4);
for (i in 1:4){
  results.posthoc[[i]] <- data.frame(condition= c("result"))
} 

# first create the dataframe with NA in all the cells
for (k in 1:length(possible.ns)){
  results[, as.character(possible.ns[k])] = rep(NA, 1)
  for (i in 1:4){
    results.posthoc[[i]][, as.character(possible.ns[k])] = rep(NA, 1)
  }
}

significant.experiments.posthoc <- vector(length=4);
for (i in 1:4){
  significant.experiments.posthoc[[i]] <- data.frame(condition= c("result"))
}


for (j in 1:length(possible.ns)){
  N <- possible.ns[j]                              # Pick the jth value for N
  print (N)
  significant.experiments <- rep(NA, sims)
  for (i in 1:4){
    significant.experiments.posthoc[[i]] <- rep(NA, sims) 
  }
  for (i in 1:sims){ #for each simulation of that N
    elaborate <- round(rnorm(N, staged_anim_mean, staged_anim_sd)) #simulate ranking for elaborate transitions
    simple <- round(rnorm(N, staged_anim_mean, staged_anim_sd)) #simulate ranking for simple transitions
    baseline <- round(rnorm(N, mean, sd)) #simulate ranking for baseline transitions
    static <- round(rnorm(N, mean, sd)) #simulate ranking for static transitions
    
    elaborate <- ifelse(elaborate > 5, 5, elaborate) #make sure they aren't below 1 or over 6
    elaborate <- ifelse(elaborate < 1, 1, elaborate) #make sure they aren't below 1 or over 6
    simple <- ifelse(simple < 1, 1, simple)
    simple <- ifelse(simple > 5, 5, simple)
    baseline <- ifelse(baseline < 1, 1, baseline)
    baseline <- ifelse(baseline > 5, 5, baseline)
    static <- ifelse(static < 1, 1, static)
    static <- ifelse(static > 5, 5, static)
    
    #put the data together
    fake_ranking <- cbind(elaborate, simple, baseline, static)
    significant.experiments[i] <- (friedman.test(fake_ranking)$p.value <= alpha)
    
    Value <- c(elaborate, simple, baseline, static)
    Group <- factor(c(rep("rank.elaborate",N),rep("rank.simple",N),rep("rank.baseline",N),rep("rank.static",N)))
    p <- pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)
    
    count = sum(c(p$p.value[1,1],p$p.value[2,1],p$p.value[3,2],p$p.value[3,3]) < alpha, na.rm=TRUE)
    for (k in 1:4){
      if(count > k-1) {
        significant.experiments.posthoc[[k]][i] = TRUE
      }else{
        significant.experiments.posthoc[[k]][i] = FALSE
      }
    }
    
  }

  results[1,as.character(N)] <- mean(significant.experiments)
  for (k in 1:4){
    results.posthoc[[k]][1,as.character(N)] <- mean(significant.experiments.posthoc[[k]])
  }
}

print("Probability of detecting significant friedman test")
print(results)
print("Probability of detecting significant friedman test and k posthoc differences between staged animations and the others.")
print(results.posthoc)



