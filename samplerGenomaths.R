#install.packages("remotes")
#remotes::install_github("genomaths/usefr")
library(usefr)

sink("sample-mixed-normal-distribution.js")
cat("var SAMPLE_MIXED_NORMAL_DISTRIBUTION = [];")

seeds <- list(123, 1, 12, 1234, 1e6, 2e6, 3e6, 4e6, 2, 3)

nn <- 1e3

# ========= A mixture of three distributions =========

phi = c(7/10, 3/10) # Mixture proportions

# ---------------------------------------------------------
# === Named vector of the corresponding distribution function parameters
# must be provided
args <- list(norm = c(mean = 1, sd = 1), norm = c(mean = 5, sd = 1))
i = 0
for (seed in seeds) {
  set.seed(seed) # set a seed for random generation
  
  # ===== Sampling from the specified mixture distribution ====
  x <- rmixtdistr(n = nn, phi = phi , arg = args)
  # ------------------------------------------------------------
  
  # === The graphics for the simulated dataset and the corresponding theoretical
  # mixture distribution
  par(bg = "gray98", mar = c(3, 4, 2, 1) )
  hist(x, 90, freq = FALSE, las = 1, family = "serif", col = rgb(0, 0, 1, 0.2), border = "deepskyblue")
  x1 <- seq(-4, 10, by = 0.001)
  lines(x1, dmixtdistr(x1, phi = phi, arg = args), col = "red")
  
  cat(c("SAMPLE_MIXED_NORMAL_DISTRIBUTION[",i,"] = ["))
  cat(toString(x))
  cat("];")
  i = i + 1
}

sink()