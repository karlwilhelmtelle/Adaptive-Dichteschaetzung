n <- "100.000"

`n^0.33.samples.per.bin` <- read.csv(paste("C:\\Projects\\Bachelorarbeit-Karl-Telle\\console-data\\n=",n,"\\n^0.33 samples per bin.csv",sep=""), head = TRUE, sep=";")
`n^0.5.samples.per.bin` <- read.csv(paste("C:\\Projects\\Bachelorarbeit-Karl-Telle\\console-data\\n=",n,"\\n^0.5 samples per bin.csv",sep=""), head = TRUE, sep=";")
`n^0.66.samples.per.bin` <- read.csv(paste("C:\\Projects\\Bachelorarbeit-Karl-Telle\\console-data\\n=",n,"\\n^0.66 samples per bin.csv",sep=""), head = TRUE, sep=";")
`log10.bins` <- read.csv(paste("C:\\Projects\\Bachelorarbeit-Karl-Telle\\console-data\\n=",n,"\\log10 bins.csv",sep=""), head = TRUE, sep=";")
`log.bins` <- read.csv(paste("C:\\Projects\\Bachelorarbeit-Karl-Telle\\console-data\\n=",n,"\\log bins.csv",sep=""), head = TRUE, sep=";")



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

titles = list("RMSE", "KL-Divergenz", "Integral Differenz")

get_boxplots <- function (startIndex, names) {
  i = 1
  for (title in titles) {
    id = startIndex + i
    #id = 7 + i
    
    data <- data.frame(
      dataset[[1]]$`adaptiv`[id],
      dataset[[2]]$`adaptiv`[id],
      dataset[[3]]$`adaptiv`[id],
      dataset[[4]]$`adaptiv`[id],
      dataset[[5]]$`adaptiv`[id],
      dataset[[1]]$`nicht-adaptiv`[id]
    )
    
    colors = c(rep("red",5), "yellow")
    
    
    boxplot(data, names = names, col = colors, main = title)
    
    #legend("topright", ,
    #       c("adaptiv", "nicht-adaptiv"), 
    #       fill=c("red", "yellow"), horiz=TRUE, cex=0.8, bg='lightgrey')
    i = i + 1
  }
}

names = c("cbrt(n)", "sqrt(n)","cbrt(n²)", 
          "log_10 n", "ln n", "nicht-adaptiv")

get_boxplots(4, names)


names = c("R = 1", "R = 1/2", "E = 1/2", 
          "E = 1/4", "E = -1/8", "nicht-adaptiv")

get_boxplots(7, names)

