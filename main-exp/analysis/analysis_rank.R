#Set working directory
# setwd("")
df = read.csv('responses-ranking.csv')

#Exclude the participants who self-reported color deficiency
df = df[df$vision_deficiency=='no',];
#Exclude the 3 who got accuracies lower than chance (<0.5)
df = df[df$userID != '1AVKB4qzGsd4735GM4P4fxVnNCn1' & df$userID !='6RE8zGtYM5UnUwRmKtsT787u3u63' & df$userID !='QRG6gODqk8cfyP3q8khiEXzpD5z2',];

newdf = df[,c("rank.elaborate", "rank.simple", "rank.baseline", "rank.static", "agg", "treatment")]

# Overall Ranking
data = cbind(newdf$rank.elaborate,newdf$rank.simple, newdf$rank.baseline, newdf$rank.static)
print(colMeans(data))
friedman.test(data)

## Post-hoc for the overall ranking
N = nrow(newdf)
Value <- c(newdf$rank.elaborate,newdf$rank.simple, newdf$rank.baseline, newdf$rank.static)
Group <- factor(c(rep("rank.elaborate",N),rep("rank.simple",N),rep("rank.baseline",N),rep("rank.static",N)))
pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)



# Per Agg. Operation

results.friedman <- vector(mode="list", length=8);
results.wilcox <- vector(mode="list", length=8);
names(results.friedman) <- c("count", "sum", "max", "min", "avg", "median", "stdev", "iqr");
names(results.wilcox) <- c("count", "sum", "max", "min", "avg", "median", "stdev", "iqr");

for (agg in c("count", "sum", "max", "min", "avg", "median", "stdev", "iqr")) {
  subRes = newdf[newdf$agg==agg,];
  print(agg);

  data = cbind(subRes$rank.elaborate,subRes$rank.simple, subRes$rank.baseline, subRes$rank.static)
  results.friedman[[agg]] <- friedman.test(data)
  print(results.friedman[[agg]])
  print(colMeans(data))

  N = nrow(subRes)
  Value <- c(subRes$rank.elaborate, subRes$rank.simple, subRes$rank.baseline, subRes$rank.static)
  Group <- factor(c(rep("rank.elaborate",N),rep("rank.simple",N),rep("rank.baseline",N),rep("rank.static",N)))
  results.wilcox[[agg]] <- pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)

  print(results.wilcox[[agg]])
}





# Per Aggs | elaborate
elaboratedf = newdf[newdf$treatment =='elaborate',]
results.friedman <- vector(mode="list", length=8);
results.wilcox <- vector(mode="list", length=8);
names(results.friedman) <- c("count", "sum", "max", "min", "avg", "median", "stdev", "iqr");
names(results.wilcox) <- c("count", "sum", "max", "min", "avg", "median", "stdev", "iqr");

## Generate Models
for (agg in c("count", "sum", "max", "min", "avg", "median", "stdev", "iqr")) {
  subRes = elaboratedf[elaboratedf$agg==agg,];
  print(agg);

  data = cbind(subRes$rank.elaborate,subRes$rank.simple, subRes$rank.baseline, subRes$rank.static)
  results.friedman[[agg]] <- friedman.test(data)
  print(results.friedman[[agg]])
  print(colMeans(data))

  N = nrow(subRes)
  Value <- c(subRes$rank.elaborate, subRes$rank.simple, subRes$rank.baseline, subRes$rank.static)
  Group <- factor(c(rep("rank.elaborate",N),rep("rank.simple",N),rep("rank.baseline",N),rep("rank.static",N)))
  results.wilcox[[agg]] <- pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)

  print(results.wilcox[[agg]])
}


# Per Aggs | simple
simpledf = newdf[newdf$treatment =='simple',]
results.friedman <- vector(mode="list", length=8);
results.wilcox <- vector(mode="list", length=8);
names(results.friedman) <- c("count", "sum", "max", "min", "avg", "median", "stdev", "iqr");
names(results.wilcox) <- c("count", "sum", "max", "min", "avg", "median", "stdev", "iqr");

## Generate Models
for (agg in c("count", "sum", "max", "min", "avg", "median", "stdev", "iqr")) {
  subRes = simpledf[simpledf$agg==agg,];
  print(agg);

  data = cbind(subRes$rank.elaborate,subRes$rank.simple, subRes$rank.baseline, subRes$rank.static)
  results.friedman[[agg]] <- friedman.test(data)
  print(results.friedman[[agg]])
  print(colMeans(data))

  N = nrow(subRes)
  Value <- c(subRes$rank.elaborate, subRes$rank.simple, subRes$rank.baseline, subRes$rank.static)
  Group <- factor(c(rep("rank.elaborate",N),rep("rank.simple",N),rep("rank.baseline",N),rep("rank.static",N)))
  results.wilcox[[agg]] <- pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)

  print(results.wilcox[[agg]])
}







### bias?
N = nrow(newdf)
Value <- newdf$rank.elaborate
Group <- newdf$treatment
pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)

data = cbind(newdf[newdf$treatment =='elaborate',]$rank.elaborate
             ,newdf[newdf$treatment =='simple',]$rank.elaborate
             ,newdf[newdf$treatment =='baseline',]$rank.elaborate
             ,newdf[newdf$treatment =='static',]$rank.elaborate)
colMeans(data)
friedman.test(data)










### bias?
N = nrow(newdf)
Value <- newdf$rank.elaborate
Group <- newdf$treatment
pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)

data = cbind(newdf[newdf$treatment =='elaborate',]$rank.elaborate
             ,newdf[newdf$treatment =='simple',]$rank.elaborate
             ,newdf[newdf$treatment =='baseline',]$rank.elaborate
             ,newdf[newdf$treatment =='static',]$rank.elaborate)
colMeans(data)
friedman.test(data)

N = nrow(newdf)
Value <- newdf$rank.simple
Group <- newdf$treatment
pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)

data = cbind(newdf[newdf$treatment =='elaborate',]$rank.simple
             ,newdf[newdf$treatment =='simple',]$rank.simple
             ,newdf[newdf$treatment =='baseline',]$rank.simple
             ,newdf[newdf$treatment =='static',]$rank.simple)
colMeans(data)
friedman.test(data)


N = nrow(newdf)
Value <- newdf$rank.baseline
Group <- newdf$treatment
pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)

data = cbind(newdf[newdf$treatment =='elaborate',]$rank.baseline
             ,newdf[newdf$treatment =='simple',]$rank.baseline
             ,newdf[newdf$treatment =='baseline',]$rank.baseline
             ,newdf[newdf$treatment =='static',]$rank.baseline)
colMeans(data)
friedman.test(data)


N = nrow(newdf)
Value <- newdf$rank.static
Group <- newdf$treatment
pairwise.wilcox.test(Value, Group, p.adj="bonferroni", exact=F, paired=T)

data = cbind(newdf[newdf$treatment =='elaborate',]$rank.static
             ,newdf[newdf$treatment =='simple',]$rank.static
             ,newdf[newdf$treatment =='baseline',]$rank.static
             ,newdf[newdf$treatment =='static',]$rank.static)
colMeans(data)
friedman.test(data)