N <- 100000

components <- sample(1:3,prob=c(0.3,0.5,0.2),size=N,replace=TRUE)
mus <- c(0,10,3)
sds <- sqrt(c(1,1,0.1))

samples <- rnorm(n=N,mean=mus[components],sd=sds[components])
#hist(samples)
samples

plot(density(samples),main="Density Estimate of the Mixture Model")

x = seq(-20,20,.1)
truth <- .3*dnorm(x,0,1) + .5*dnorm(x,10,1) + .2*dnorm(x,3,.1)
plot(density(samples),main="Density Estimate of the Mixture Model",ylim=c(0,.2),lwd=2)
lines(x,truth,col="red",lwd=2)

legend("topleft",c("True Density","Estimated Density"),col=c("red","black"),lwd=2)