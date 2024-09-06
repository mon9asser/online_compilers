const restrictedPatterns = [/exec\(/, /spawn\(/, /rm/, /npm/, /git/, /ls/, /forever/, /killall/, /kill/, /fkill/, /taskkill/, /nodemon/, /node/, /cat/, /cd/];

module.exports = { restrictedPatterns }