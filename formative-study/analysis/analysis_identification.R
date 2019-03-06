# install.packages("lme4")
# install.packages("brms")
# install.packages('sigmoid')
# install.packages('emmeans')
library(brms)
# setwd("")
df = read.csv('responses_identification.csv')

#Exclude the participants who self-reported color deficiency
df = df[df$vision_deficiency=='no',];
#Exclude the 3 who got accuracies lower than chance (<0.5)
df = df[df$userID != '1AVKB4qzGsd4735GM4P4fxVnNCn1' & df$userID !='6RE8zGtYM5UnUwRmKtsT787u3u63' & df$userID !='QRG6gODqk8cfyP3q8khiEXzpD5z2',];
#Exclude 2 responses that took more than an hour.
df = df[df$compTime < 60*60*1000,];

newdf = df[,c("userID", "isError", "treatment", "id", "compTime", "animAgg", "textAgg", "playCount")]
newdf[, 'playCount'] <- as.numeric((df[, 'playCount']))
newdf[, 'compTime'] <- as.numeric((df[, 'compTime']))
newdf[, 'id'] <- as.numeric(newdf[, 'id'])
newdf[, 'mismatch'] <- ifelse(newdf$animAgg==newdf$textAgg, FALSE, TRUE)
newdf[, 'userID'] <- as.factor(newdf[, 'userID'])
newdf[, 'treatment'] <- as.factor(newdf[, 'treatment'])
newdf[, 'isError'] <- as.factor(newdf[, 'isError'])
newdf[, 'correct'] <- ifelse(newdf$isError == 'false', TRUE, FALSE)


df2 = newdf[newdf$animAgg!='min',]
dMin = newdf[newdf$animAgg=='min',]

# Error model
m_error <- brm(correct ~ animAgg*treatment + mismatch + id + (1|userID) , data= df2, family = bernoulli(), control = list(adapt_delta=0.99, max_treedepth = 10), cores = 4)
summary(m_error)
# Error model for min
mMin_e <- brm(correct ~ treatment + id + (1|userID), data= dMin, family = bernoulli(), control = list(adapt_delta=0.99, max_treedepth = 15), cores = 4)
summary(mMin_e)

# Completion Time model
m_time <- brm(compTime ~ animAgg*treatment + mismatch + id + (1|userID), data= df2, family = shifted_lognormal(), control = list(adapt_delta=0.8, max_treedepth = 10), cores = 4)
summary(m_time)

# Completion time model for min
mMin_t <- brm(compTime ~ treatment + id + (1|userID), data= dMin, family = shifted_lognormal(), control = list(adapt_delta=0.99, max_treedepth = 15), cores = 4)
summary(mMin_t)

# Play count model
m_count <- brm(playCount ~ animAgg*treatment + mismatch + id + (1|userID), data= df2, family = poisson(), control = list(adapt_delta=0.8, max_treedepth = 15), cores = 4)
summary(m_count)

# Play count model for min
mMin_c <- brm(playCount ~ treatment + id + (1|userID), data= dMin, family = poisson(), control = list(adapt_delta=0.99, max_treedepth = 10), cores = 4)
summary(mMin_c)