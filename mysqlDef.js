var mysql = require('mysql');
var  mysql_config = {
    host: '127.0.0.1',
    user: 'root',
    password: '1755',
};
//单个连接的多语句查询配置
var  mysql_config_multi = {
    host: mysql_config.host,
    user: mysql_config.user,
    password: mysql_config.password,
    multipleStatements:true
};

var  mysql_config_bsDesign = {
    host: mysql_config.host,
    user: mysql_config.user,
    password: mysql_config.password,
    multipleStatements:true,
    database : 'bsDesign'
};


// 使用连接池
var poolConn = mysql.createPool(mysql_config);
//连接池查询
var querypoll = function(sql,callback){
    poolConn.getConnection(function(err,conn){
        if(err){
            callback(err,null);
        }else{
            var query = conn.query(sql,function(qerr,result){
                //释放连接
                conn.release();
                //事件驱动回调
                callback(qerr,result);
            });
        }
    });
};

//不使用连接池
var query = function (sql,callback) {
var conn = mysql.createConnection(mysql_config_multi);
    //连接错误，2秒重试
    conn.connect(function (err) {
        if (err) {
            console.log("error when connecting to db:", err);
            setTimeout(query , 2000);
        }else{
        var query = conn.query(sql,function(qerr,result){
                //关闭连接
                conn.end();  
                //事件驱动回调
                callback(qerr,result);
            });
        }
    });

    conn.on("error",function (err) {
        console.log("db error", err);
        // 如果是连接断开，自动重新连接
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
            query();
        } else {
            throw err;
        }
    });
}


//mystuff专用连接池  设置了database的
var bsDesignpoolConn = mysql.createPool(mysql_config_bsDesign);
//连接池查询
var bsDesignQuerypoll = function(sql,callback){
    bsDesignpoolConn.getConnection(function(err,conn){
        if(err){
            callback(err,null);
        }else{
            var query = conn.query(sql,function(qerr,result){
                //释放连接
                conn.release();
                //事件驱动回调
                callback(qerr,result);
            });
        }
    });
};


module.exports = {
    querypoll:querypoll,
    query:query,
    bsDesignQuerypoll:bsDesignQuerypoll
};
