tables = list(`n^0.33.samples.per.bin`,
              `n^0.5.samples.per.bin`,
              `n^0.66.samples.per.bin`,
              `log10.bins`, 
              `log.bins`)
i = 1
dataset = list(10)
for (table in tables) {
  dataset[[i]] <- split(table, table$`adaptiv`)
  i = i + 1
}


# RMSE
# data <- data.frame(
#   dataset$`adaptiv`[5], 
#   dataset$`nicht-adaptiv`[5],
#   dataset$`adaptiv`[6], 
#   dataset$`nicht-adaptiv`[6],
#   dataset$`adaptiv`[7], 
#   dataset$`nicht-adaptiv`[7]
#   )

titles = list("RMSE", "KL-Divergenz", "Integral Differenz")
i = 1
for (title in titles) {
  id = 4 + i
  
  
  data <- data.frame(
    dataset[[1]]$`adaptiv`[id],
    dataset[[2]]$`adaptiv`[id],
    dataset[[3]]$`adaptiv`[id],
    dataset[[4]]$`adaptiv`[id],
    dataset[[5]]$`adaptiv`[id],
    dataset[[1]]$`nicht-adaptiv`[id]
  )
  
  colors = c(rep("red",5), "yellow")
  names = c("cbrt(n)", "sqrt(n)","cbrt(n²)", "log_10 n", "ln n", "nicht-adaptiv")
  
  boxplot(data, names = names, col = colors, main = title)
  
  legend("topleft", inset=.02,
         c("adaptiv", "nicht-adaptiv"), 
         fill=c("red", "yellow"), horiz=TRUE, cex=0.8, bg='lightgrey')
  i = i + 1
}
