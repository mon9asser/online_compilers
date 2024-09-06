const restrictedPatterns = [/exec\(/, /spawn\(/, /rm/, /npm/, /git/, /ls/, /forever/, /killall/, /eval\(/g, /exec\(/g,/open\(/g, /kill/, /fkill/, /taskkill/, /nodemon/, /node/, /cat/, /cd/];

module.exports = { restrictedPatterns }