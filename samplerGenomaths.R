#install.packages("remotes")
#remotes::install_github("genomaths/usefr")
library(usefr)
# 123, 1, 12, 1234, 1e6, 2e6, 3e6, 4e6, 2, 3
set.seed(123) # set a seed for random generation
# ========= A mixture of three distributions =========
nn <- 1e3
phi = c(7/10, 3/10) # Mixture proportions


# ---------------------------------------------------------
# === Named vector of the corresponding distribution function parameters
# must be provided
args <- list(norm = c(mean = 1, sd = 1), norm = c(mean = 5, sd = 1))
# ------------------------------------------------------------

# ===== Sampling from the specified mixture distribution ====
x <- rmixtdistr(n = nn, phi = phi , arg = args)
# ------------------------------------------------------------

# === The graphics for the simulated dataset and the corresponding theoretical
# mixture distribution
par(bg = "gray98", mar = c(3, 4, 2, 1) )
hist(x, 90, freq = FALSE, las = 1, family = "serif", col = rgb(0, 0, 1, 0.2), border = "deepskyblue")
x1 <- seq(-4, 10, by = 0.001)
lines(x1, dmixtdistr(x1, phi = phi, arg = args), col = "red")

sink("sample-mixed-normal-distribution.js")
cat("var SAMPLE_MIXED_NORMAL_DISTRIBUTION = [")
cat(toString(x))
cat("]")
sink()