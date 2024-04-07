var selfMysql = require('./mysqlDef');
const defCategoryObj =  require('./defCategory.json')
//定时器 定时删除分享码 每天的凌晨1点1分30秒触发
var schedule = require('node-schedule');
schedule.scheduleJob('30 1 1 * * *', deleteShareCode); 

const multer = require('multer');
//设置临时目录 存放上传的图片
const upload = multer({dest: "tmp/"});

const fs=require('fs');
const request=require('request');
const express = require('express')
const app = express()

app.use(require('cors')())  // 允许跨域请求
app.use(express.json())    // 通过 express.json() 这个中间件，解析表单中的 JSON 格式的数据
app.use('/file',express.static('./tmpCSV'))

const http = require('http');
const { json } = require('body-parser');
const server = http.createServer(app);
// server.listen(4000)
// 允许socket的请求跨域，端口号为 3000
var io = require('socket.io')(server, { cors: true });

// const AVATAR_URL_BASE = `C:/httpd-2.4.49-win64-VS16/Apache24/htdocs/80/static/bsDesignAvatar`
const AVATAR_URL_BASE = `/root/node_bash/node_bs/static/bsDesignAvatar`
const CSV_URL_BASE = `http://172.168.1.33:3100/csv`
const MYSQL_OUTPUT_BASE = '/var/lib/mysql-files'

//传入账本id、支出or收入 获得没有被删除的[{一级分类, [二级分类]}]
app.post('/categoryInit', (req, res) => {
  let getbookID = req.body.bookID;
  let getoutOrIn = req.body.outOrIn;
  let sql1 = `SELECT c1.cno1, c1.c1Name, c1.c1IcoUnicode, c2.cno2, c2.c2Name, c2.c2IcoUnicode
  FROM
  (SELECT *
  FROM categoryOne
  WHERE bookID=${getbookID} AND outOrIn=${getoutOrIn} AND isDelete=0) AS c1
  LEFT JOIN 
  (SELECT *
  FROM categoryTwo WHERE isDelete=0) AS c2
  ON c1.cno1 = c2.cno1
  ORDER BY c1.cno1;`;
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      let lastC1Obj = {'cno1': 0, 'c1Name':'其他', 'c1IcoUnicode':'&#xe690;', 'c2Arr':[]};
      let finalArr = [];
      for (let i = 0; i < data.length; i++) {
        if (data[i].cno1 === lastC1Obj.cno1) {
          lastC1Obj.c2Arr.push({ 'cno2': data[i].cno2, 'c2Name': data[i].c2Name, 'c2IcoUnicode': data[i].c2IcoUnicode });
        } else {
          finalArr.push(lastC1Obj);
          lastC1Obj = {};
          lastC1Obj.cno1 = data[i].cno1;
          lastC1Obj.c1Name = data[i].c1Name;
          lastC1Obj.c1IcoUnicode = data[i].c1IcoUnicode;
          if(data[i].cno2) {
            lastC1Obj.c2Arr = [{ 'cno2': data[i].cno2, 'c2Name': data[i].c2Name, 'c2IcoUnicode': data[i].c2IcoUnicode }]
          }

        }
      }
      if ('cno1' in lastC1Obj) {
        finalArr.push(lastC1Obj);
        lastC1Obj = {};
      }
      // console.log(data);
      // console.log(finalArr);
      res.send(finalArr);
    }
  });
});

//传入用户id 从关系表里获取该用户所有账本id和账本名字  (只会给出可写的和没删除的)
app.post('/bookIDInit', (req, res) => {
  let getUserID = req.body.userID;
  let sql1 = `SELECT bid.bookID, bname.bookName
  FROM bookRelation bid LEFT JOIN accountBook bname
  ON bid.bookID=bname.bookID
  WHERE  bid.userID=`+getUserID+` AND bid.isWrite=1 AND bid.isDelete=0 AND bid.isAgree=1 AND bname.isDelete=0;`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      res.send(data);
    }
  });
});

//保存账单  注意price有正负号
app.post('/billDateSave', (req, res) => {
  const reqObj = req.body;
  let sql1 = `INSERT INTO billDetail VALUES
  (NULL, ${reqObj.bookID}, ${reqObj.outOrIn}, ${reqObj.editUserId}, `;
  if('billName' in reqObj) {
    sql1 += `'${reqObj.billName}', ${reqObj.cno1}, ${reqObj.cno2}, `
  }else {
    sql1 += `NULL, ${reqObj.cno1}, ${reqObj.cno2}, `
  }
  if(!reqObj.outOrIn) {
    sql1 += `-`
  }
  sql1 += `${reqObj.price}, '${reqObj.recordDate}', NULL);`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      res.send('ok');
      emitToNewDateInBook(reqObj.bookID, reqObj.editUserId)
    }
  });
});

//更改账单 注意price有正负号
app.post('/billDateUpdate', (req, res) => {
  const reqObj = req.body;
  let sql1 = `UPDATE billDetail 
  SET bookID=${reqObj.bookID}, outOrIn=${reqObj.outOrIn}, editUserId=${reqObj.editUserId}, `;
  if('billName' in reqObj) {
    sql1 += `billName='${reqObj.billName}', cno1=${reqObj.cno1}, cno2=${reqObj.cno2}, price=`
  }else {
    sql1 += `billName=NULL, cno1=${reqObj.cno1}, cno2=${reqObj.cno2}, price=`
  }
  if(!reqObj.outOrIn) {
    sql1 += `-`
  }
  sql1 += `${reqObj.price}, recordDate='${reqObj.recordDate}' WHERE bid=${reqObj.bid};`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      res.send('ok');
      emitToNewDateInBook(reqObj.bookID, reqObj.editUserId)
    }
  });
});

//传入用户微信openid 获取该用户id,没有则返回no
app.post('/openidLogin', (req, res) => {
  let getOpenid = req.body.openid;
  let sql1 = `SELECT userID
  FROM userDetail 
  WHERE wechatOpenid = '`+getOpenid+`';`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      if(data.length === 0) {
        res.send('no');
      }else {
        res.send(data[0]);
      }
    }
  });
});

//微信注册用户
app.post('/wxRegistration', (req, res) => {
  let reqObj = req.body;
  let sql1 = `INSERT INTO userDetail VALUES
  (NULL, '`+reqObj.userName+`', NULL, NULL, '`+reqObj.wechatOpenid+`', NULL, NULL);`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      createBookDef(data.insertId);
      wxAvatarSave(data.insertId, reqObj.avatarUrl)
      // console.log(reqObj.avatarUrl);
      res.send(data);
    }
  });
});

//手机号登录  model:true 没有手机号就注册
app.post('/phoneLogin', (req, res) => {
  let reqObj = req.body;
  let sql1 = `SELECT userID FROM userDetail WHERE phone='`+reqObj.phone+`'; `
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      if(data.length === 0) {
        //不存在这个手机号
        if(reqObj.model) {
          //新建账号
          let sql1 = `INSERT INTO userDetail VALUES
          (NULL, '新用户', '`+reqObj.userPassword+`', `+reqObj.phone+`, NULL, NULL, NULL);`
          selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
            if (err) {
              console.log(err);
            } else {
              createBookDef(data.insertId);
              res.send({'code':'ok', 'userID':data.insertId})
            }
          });
        }else {
          res.send({'code':'err', 'msg':'账号不存在'})
        }
      }else {
        //判断密码
        let sql1 = `SELECT userID FROM userDetail WHERE phone='`+reqObj.phone+`' AND userPassword='`+reqObj.userPassword+`';`
        selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
          if (err) {
            console.log(err);
          } else {
            if(data.length === 0) {
              res.send({'code':'err', 'msg':'密码错误'})
            }else {
              res.send({'code':'ok', 'userID':data[0].userID})
            }
          }
        });
      }
    }
  });

});

//按照月份 获取指定账本的账单信息 {date:[{账单1}{账单2}{账单3}]}
app.post('/getBillByMonth', (req, res) => {
  let reqObj = req.body;
  let sql1 = `SELECT DATE_FORMAT(b.recordDate, '%Y-%m-%d') AS 'date', b.bid, b.bookID, b.outOrIn, b.editUserId, b.billName, c1.c1Name, c2.c2Name, b.price, DATE_FORMAT(b.createTime,'%Y-%m-%d %H:%i:%s') AS createTime
  FROM billDetail b
  LEFT JOIN categoryOne c1
  ON b.cno1= c1.cno1
  LEFT JOIN categoryTwo c2
  ON b.cno2= c2.cno2
  WHERE b.bookID=${reqObj.bookID} AND b.recordDate LIKE '${reqObj.year}-${reqObj.month}%'
  ORDER BY b.recordDate DESC;`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      let resultObj = {};
      for(let i=0; i<data.length; i++) {
          if(data[i].date in resultObj) {
              resultObj[data[i].date].push(data[i])
          }else {
              resultObj[data[i].date] = [data[i]]
          }
      }
      res.send(resultObj)
    }
  });

});

//根据分类id 获取ico和cname
app.post('/getCategoryIco', (req, res) => {
  let reqObj = req.body;
  let sql1 = '';
  if(reqObj.model == 1) {
    sql1 = `SELECT c1IcoUnicode, c1Name FROM categoryOne WHERE cno1=${reqObj.numb};`
  }else {
    sql1 = `SELECT c2IcoUnicode, c2Name FROM categoryTwo WHERE cno2=${reqObj.numb};    `
  }
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      res.send(data)
    }
  });

});

//删除分类 (isdelete修改为1) 
app.post('/delCategory', (req, res) => {
  let reqObj = req.body;
  let sql1 = '';
  if(reqObj.model == 1) {
    //删除一级分类时，二级分类也一起删掉
    sql1 = `UPDATE categoryOne SET isDelete=1 WHERE cno1=${reqObj.numb};
    UPDATE categoryTwo SET isDelete=1 WHERE cno1=${reqObj.numb};`
  }else {
    sql1 = `UPDATE categoryTwo SET isDelete=1 WHERE cno2=${reqObj.numb};`
  }
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send('err')
    } else {
      res.send('ok')
    }
  });

});

//发送默认分类
app.get('/defCategoryInit', (req, res) => {
  res.send(defCategoryObj)
});

//修改分类，传入的参数可能为cno1/cno2 
app.post('/updateCategory', (req, res) => {
  let reqObj = req.body;
  let sql1 = '';
  if('cno1' in reqObj) {
    //更新一级分类
    sql1 = `UPDATE categoryOne SET c1Name='${reqObj.cName}', c1IcoUnicode='${reqObj.IcoUnicode}' WHERE cno1=${reqObj.cno1};`
  }else {
    //更新二级分类
    sql1 = `UPDATE categoryTwo SET c2Name='${reqObj.cName}', c2IcoUnicode='${reqObj.IcoUnicode}' WHERE cno2=${reqObj.cno2};`
  }
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send('err')
    } else {
      res.send('ok')
    }
  });

});

//增加分类，传入的参数没有cno1就是新增一级分类，有就是新增二级分类
app.post('/addCategory', (req, res) => {
  let reqObj = req.body;
  let sql1 = '';
  if('cno1' in reqObj) {
    //更新二级分类
    sql1 = `INSERT INTO categoryTwo VALUES
    (${reqObj.cno1}, NULL, '${reqObj.cName}', '${reqObj.IcoUnicode}', 0, NULL);`
  }else {
    //更新一级分类
    sql1 = `INSERT INTO categoryOne VALUES
    (${reqObj.bookID}, NULL, ${reqObj.outOrIn}, '${reqObj.cName}', '${reqObj.IcoUnicode}', 0, NULL);`
  }
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send('err')
    } else {
      res.send('ok')
    }
  });

});

//获取某月份每一天的收入+支出求和
app.post('/calendarInit', (req, res) => {
  const reqObj = req.body;
  let sql1 = `SELECT DATE_FORMAT(recordDate, '%Y-%m-%d') AS 'date', SUM(price) AS info 
  FROM billDetail 
  WHERE bookID=${reqObj.bookID} AND recordDate LIKE '${reqObj.year}%${reqObj.month}%'
  GROUP BY recordDate;`;
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });

});

//根据bid返回该商品信息
app.post('/findWithBid', (req, res) => {
  const bid = req.body.bid;
  let sql1 = `SELECT DATE_FORMAT(recordDate, '%Y-%m-%d') AS recordDate, bid, bookID, outOrIn, editUserId, billName, cno1, cno2, price, createTime
  FROM billDetail WHERE bid=${bid};`;
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });

});

//根据userid返回用户所有信息
app.post('/findUserWithID', (req, res) => {
  let sql1 = `SELECT DATE_FORMAT(RegistrantTime,'%Y-%m-%d %H:%i:%s') AS RegistrantTime, userID, userName, phone, wechatOpenid, avatarUrlPC, userPassword FROM userDetail 
  WHERE userID=${req.body.userID};`;
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据userid 更新头像
app.post('/updateAvatar', (req, res) => {
  AvatarSaveInSQL(req.body.userID, req.body.src, function(data) { 
    res.send(data)
  });
});

// 接受用户上传的头像
app.post("/uploadAvatar", upload.single("file"), (req, res) => {
  let tpUserID = req.body.userID;
  let imgFile = req.file;//获取图片上传的资源
  let tmp = imgFile.path;//获取临时资源
  let newPath = `${AVATAR_URL_BASE}/userUpload/${tpUserID}.png`
  let fileData = fs.readFileSync(tmp);
  fs.writeFileSync(newPath, fileData);
  AvatarSaveInSQL(tpUserID, `/userUpload/${tpUserID}.png`, function(data) {
    res.send(data)
  });
})

//根据userid 更新信息
app.post('/updateUserDetail', (req, res) => {
  const reqObj = req.body;
  let sql1;
  if('userName' in reqObj) {
    sql1 = `UPDATE userDetail SET userName='${reqObj.userName}' WHERE userID=${reqObj.userID};`
  }else {
    sql1 = `UPDATE userDetail SET userPassword='${reqObj.userPassword}' WHERE userID=${reqObj.userID};`
  }
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bid 删除商品信息
app.post('/deleteDetail', (req, res) => {
  let sql1=`DELETE FROM billDetail WHERE bid=${req.body.bid};`;
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
      emitToNewDateInBook(req.body.bookID, req.body.userID);
    }
  });
});

//根据userid 获取该用户所有参与的账本信息
app.post('/getAllAccountBook', (req, res) => {
  let sql1 = `SELECT DATE_FORMAT(a.createTime,'%Y-%m-%d') as createTime, a.isWrite, a.isCreater, a.bookID, b.bookName, b.isShare FROM bookrelation a, accountbook b WHERE a.userID=${req.body.userID} AND a.isAgree=1 AND a.isDelete=0 AND a.bookID=b.bookID AND b.isDelete=0;`;
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据userid、bokid 检查用户账本有无写权限
app.post('/checkWritePermissions', (req, res) => {
  let sql1 = `SELECT * FROM bookrelation WHERE userID=${req.body.userID} AND bookID=${req.body.bookID} AND isDelete=0;`;
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookid 获得该账本详情
app.post('/getAccountBookDetail', (req, res) => {
  let sql1 = `SELECT bookName, isShare, createrID, DATE_FORMAT(createTime,'%Y-%m-%d') as createTime FROM accountbook WHERE bookID=${req.body.bookID} AND isDelete=0;`;
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookid 获得该账本所有成员头像、名称、是否同意、userID
app.post('/accountBookAllUser', (req, res) => {
  let sql1 = `SELECT b.*, u.userName, u.avatarUrlPC, u.userID FROM bookrelation b, userdetail u WHERE b.bookID=${req.body.bookID} AND b.isDelete=0 AND b.userID=u.userID;`;
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookid 更新账本名称
app.post('/updateAccountBookName', (req, res) => {
  let sql = `UPDATE accountbook SET bookName='${req.body.bookName}' WHERE bookID=${req.body.bookID} AND isDelete=0;`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookid 更新账本共享状态，如果是关闭共享，则将accountrelative里面的除作者外成员全部isDelete=1
app.post('/updateAccountBookIsShare', (req, res) => {
  let sql = `
    UPDATE accountbook SET isShare=${req.body.isShare} WHERE bookID=${req.body.bookID};
    UPDATE bookrelation SET isDelete=${Number(!req.body.isShare)} WHERE bookID=${req.body.bookID} AND userID<>(SELECT createrID AS userID FROM accountbook WHERE bookID=${req.body.bookID});
  `
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
      //关闭共享，则将在线用户的账本换成默认的
      if(req.body.isShare == 0) {
        emitToBeCloseShareUser(req.body.bookID)
      }
    }
  });
});

//根据userID查找用户是否存在
app.post('/checkUserExist', (req, res) => {
  let sql = `SELECT * FROM userDetail WHERE userID='${req.body.userID}';`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据userID bookID uuid 找出该用户的详细信息和对该账本的关系
app.post('/getOtherUserInfo', (req, res) => {
  let sql = `
    SELECT a.userID, a.userName, a.phone, a.avatarUrlPC, b.bookID, b.isCreater, b.isAgree, b.isWrite, DATE_FORMAT(a.RegistrantTime,'%Y-%m-%d') AS RegistrantTime
    FROM userdetail a 
    LEFT JOIN bookrelation b 
    ON a.userID=b.userID AND b.bookID=${req.body.bookID}
    WHERE a.userID=${req.body.uuid};
  `
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据userID、bookID、isWatcher 创建 该用户在账本中的权限  isWatcher=1将无写入权限
app.post('/inviteUser', (req, res) => {
  let sql = ``;
  if(req.body.isWatcher) {
    //监管者
    sql =  `INSERT INTO bookRelation VALUES(${req.body.bookID}, ${req.body.uuid}, 0, 0, 0, 0, NULL);`
  }else {
    //可写
    sql =  `INSERT INTO bookRelation VALUES(${req.body.bookID}, ${req.body.uuid}, 0, 0, 1, 0, NULL);`
  }
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data);
      emitToBeInviteUser(req.body.bookID, req.body.isWatcher, req.body.uuid)
    }
  });
});

//根据userID、bookID、isWrite 更新用户的写权限
app.post('/updateUserRoleInBook', (req, res) => {
  let sql = `UPDATE bookRelation SET isWrite=${req.body.isWrite} WHERE bookID=${req.body.bookID} AND userID=${req.body.uuid};`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
      emitToBeChangeRoleUser(req.body.bookID, req.body.uuid)
    }
  });
});

//根据userID、bookID  删除该用户与该账本的关联  (直接delet，不是改成isDelete，防止开启共享后复活)
app.post('/deleteUserRelationInBook', (req, res) => {
  let sql = `DELETE FROM bookRelation WHERE bookID=${req.body.bookID} AND userID=${req.body.uuid};`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
      emitToBeDeleteRelateUser(req.body.bookID, req.body.uuid)
    }
  });
});

//根据userID、bookID  查找是否有与该用户相关的消息  有消息自动走socket.io推送出去
app.post('/newNotify', (req, res) => {
  //查找有没有未通知的 被邀请加入账本
  let sql = `SELECT * FROM bookRelation WHERE userID=${req.body.userID} AND isAgree=0;`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      if(data[0]) {
        emitToBeInviteUser(data[0].bookID, !data[0].isWrite, data[0].userID)
      }else {
      }
      res.send('have check')
    }
  });

});

//根据userID、bookID 同意/拒绝被邀请加入账本  agree=1同意：isAgree设1，不同意在bookrelation中删掉 并且推送给该账本的作者(即发起邀请者)
app.post('/answersInvite', (req, res) => {
  //查找有没有未通知的 被邀请加入账本
  let sql = ``;
  if(req.body.agree) {
    sql = `UPDATE bookRelation SET isAgree=1 WHERE bookID=${req.body.bookID} AND userID=${req.body.userID};`
  }else {
    sql = `DELETE FROM bookRelation WHERE bookID=${req.body.bookID} AND userID=${req.body.userID};`
  }
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send('ok');
      emitToInviteResult(req.body.bookID);
    }
  });

});

//根据userID、isShare、bookName  创建该用户账本，并且建立关系
app.post('/addAccountBook', (req, res) => {
  let sql = `INSERT INTO accountBook VALUES (NULL, ${req.body.userID}, '${req.body.bookName}', ${req.body.isShare}, 0, NULL);`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      let sql2 = `INSERT INTO bookRelation VALUES(${data.insertId}, ${req.body.userID}, 1, 1, 1, 0, NULL);`
      selfMysql.bsDesignQuerypoll(sql2, function (err, dataa) {
        if (err) {
          console.log(err);
        }else {
          res.send(dataa)
        }
      });
    }
  });
});

//根据bookID 删除账本 (将accountBook里isDelete置1，bookRelation里删除包含作者关系的所有关联 )
app.post('/deleteAccountBook', (req, res) => {
  let sql = `
  UPDATE accountBook SET isDelete=1 WHERE bookID=${req.body.bookID};
  DELETE FROM bookRelation WHERE bookID=${req.body.bookID};`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookID、和keyword 在该账本的分类或备注中
app.post('/searchBillDetail', (req, res) => {
  let sql = `
    SELECT DATE_FORMAT(b.recordDate, '%Y-%m-%d') AS 'date', b.bid, b.bookID, b.outOrIn, b.editUserId, b.billName, c1.c1Name, c2.c2Name, b.price, DATE_FORMAT(b.createTime,'%Y-%m-%d %H:%i:%s') AS createTime
    FROM billDetail b
    LEFT JOIN categoryOne c1
    ON b.cno1= c1.cno1
    LEFT JOIN categoryTwo c2
    ON b.cno2= c2.cno2
    WHERE b.bookID=${req.body.bookID} AND b.billName LIKE '%${req.body.keyword}%' OR c1.c1Name LIKE '%${req.body.keyword}%' OR c2.c2Name LIKE '%${req.body.keyword}%'
    ORDER BY b.recordDate DESC;`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      let resultObj = {};
      for(let i=0; i<data.length; i++) {
          if(data[i].date in resultObj) {
              resultObj[data[i].date].push(data[i])
          }else {
              resultObj[data[i].date] = [data[i]]
          }
      }
      res.send(resultObj)
    }
  });
});

//根据bookID、year、month 将该月份有记录的每一天 支出和收入各自的和，分别返回  返回[day, abs(total)]
app.post('/statisticsMonthLineOutIn', (req, res) => {
  let sql = `
  SELECT DATE_FORMAT(recordDate, '%d') AS 'day',  ABS(SUM(price)) AS total
  FROM billDetail 
  WHERE bookID=${req.body.bookID} AND outOrIn=0 AND recordDate LIKE '${req.body.year}-${req.body.month}%'
  GROUP BY recordDate;
  
  SELECT DATE_FORMAT(recordDate, '%d') AS 'day',  SUM(price) AS total
  FROM billDetail 
  WHERE bookID=${req.body.bookID} AND outOrIn=1 AND recordDate LIKE '${req.body.year}-${req.body.month}%'
  GROUP BY recordDate;
  `
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookID、year 将该年份有记录的月份的 支出和收入各自的和，分别返回  返回[month, abs(total)]
app.post('/statisticsYearLineOutIn', (req, res) => {
  let sql = `
  SELECT DATE_FORMAT(recordDate, '%m') AS 'month',  ABS(SUM(price)) AS total
  FROM billDetail
  WHERE bookID=${req.body.bookID} AND outOrIn=0 AND recordDate LIKE '${req.body.year}%'
  GROUP BY DATE_FORMAT(recordDate, '%m');

  SELECT DATE_FORMAT(recordDate, '%m') AS 'month',  ABS(SUM(price)) AS total
  FROM billDetail
  WHERE bookID=${req.body.bookID} AND outOrIn=1 AND recordDate LIKE '${req.body.year}%'
  GROUP BY DATE_FORMAT(recordDate, '%m');
  `
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookID、year、month 将该月份/年份各个分类的花销和  支出为data[0],收入为data[1]
app.post('/statisticsPieOutIn', (req, res) => {
  let sql = ``
  if(req.body.month) {
    sql = `
      SELECT c.c1Name AS 'name', r.total AS 'value'
      FROM categoryone c, (SELECT cno1,  ABS(SUM(price)) AS total FROM billDetail 
      WHERE bookID=${req.body.bookID} AND outOrIn=0 AND recordDate LIKE '${req.body.year}-${req.body.month}%'
      GROUP BY cno1) r
      WHERE c.cno1=r.cno1 AND c.isDelete=0;

      SELECT c.c1Name AS 'name', r.total AS 'value'
      FROM categoryone c, (SELECT cno1,  ABS(SUM(price)) AS total FROM billDetail 
      WHERE bookID=${req.body.bookID} AND outOrIn=1 AND recordDate LIKE '${req.body.year}-${req.body.month}%'
      GROUP BY cno1) r
      WHERE c.cno1=r.cno1 AND c.isDelete=0;`
  }else {
    sql = `
      SELECT c.c1Name AS 'name', r.total AS 'value'
      FROM categoryone c, (SELECT cno1,  ABS(SUM(price)) AS total FROM billDetail 
      WHERE bookID=${req.body.bookID} AND outOrIn=0 AND recordDate LIKE '${req.body.year}%'
      GROUP BY cno1) r
      WHERE c.cno1=r.cno1 AND c.isDelete=0;

      SELECT c.c1Name AS 'name', r.total AS 'value'
      FROM categoryone c, (SELECT cno1,  ABS(SUM(price)) AS total FROM billDetail 
      WHERE bookID=${req.body.bookID} AND outOrIn=1 AND recordDate LIKE '${req.body.year}%'
      GROUP BY cno1) r
      WHERE c.cno1=r.cno1 AND c.isDelete=0;`
  }
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookID、year、month 返回该月/年的支出和data[0]、收入和data[1]
app.post('/statisticsOverviewOutIn', (req, res) => {
  let sql = ``
  if(req.body.month) {
    sql = `
    SELECT SUM(price) AS 'in'
    FROM billDetail 
    WHERE bookID=${req.body.bookID} AND outOrIn=1 AND recordDate LIKE '${req.body.year}-${req.body.month}%';
    
    SELECT SUM(price) AS 'out'
    FROM billDetail 
    WHERE bookID=${req.body.bookID} AND outOrIn=0 AND recordDate LIKE '${req.body.year}-${req.body.month}%';`
  }else {
    sql = `
    SELECT SUM(price) AS 'in'
    FROM billDetail 
    WHERE bookID=${req.body.bookID} AND outOrIn=1 AND recordDate LIKE '${req.body.year}%';
    
    SELECT SUM(price) AS 'out'
    FROM billDetail 
    WHERE bookID=${req.body.bookID} AND outOrIn=0 AND recordDate LIKE '${req.body.year}%';`
  }
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookID、year、month 返回该月每一天的日报表
app.post('/statisticsEachDayTable', (req, res) => {
  let sql = ``
  if(req.body.month) {
    sql = `
      SELECT DATE_FORMAT(a.recordDate, '%m-%d') AS 'recordDate', a.balance, IFNULL(b.in,0) AS 'in', (a.balance-IFNULL(b.in,0)) AS 'out'
      FROM (SELECT recordDate, SUM(price) AS balance FROM billDetail 
      WHERE bookID=${req.body.bookID} AND recordDate LIKE '${req.body.year}-${req.body.month}%'
      GROUP BY recordDate) AS a
      LEFT JOIN (SELECT recordDate, SUM(price) AS 'in' FROM billDetail 
      WHERE bookID=${req.body.bookID} AND outOrIn=1 AND recordDate LIKE '${req.body.year}-${req.body.month}%'
      GROUP BY recordDate) AS b 
      ON a.recordDate = b.recordDate;`
  }else {
    sql = `
    SELECT a.month, a.balance, IFNULL(b.in,0) AS 'in', (a.balance-IFNULL(b.in,0)) AS 'out'
    FROM 
    (SELECT DATE_FORMAT(recordDate, '%m') AS 'month', SUM(price) AS balance FROM billDetail 
    WHERE bookID=${req.body.bookID} AND recordDate LIKE '${req.body.year}%'
    GROUP BY DATE_FORMAT(recordDate, '%m')
    ) AS a
    LEFT JOIN 
    (SELECT DATE_FORMAT(recordDate, '%m') AS 'month', SUM(price) AS 'in' FROM billDetail 
    WHERE bookID=${req.body.bookID} AND outOrIn=1 AND recordDate LIKE '${req.body.year}%'
    GROUP BY DATE_FORMAT(recordDate, '%m')
    ) AS b 
    ON a.month = b.month;`
  }
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据bookid 导出该账本所有数据
app.post('/exportAllData', (req, res) => {
  let fileName = Date.now();
  let sql = `
  SELECT '记录时间', '收支类型','账单备注','一级分类','二级分类', '价格', '创建时间'
  UNION
  SELECT  b.recordDate, IF(b.outOrIn=0,'支出','收入') AS outOrIn, IFNULL(b.billName,'无') AS billName, c1.c1Name, IFNULL(c2.c2Name,'无') AS c2Name, b.price, b.createTime
  FROM billDetail b
  LEFT JOIN categoryOne c1
  ON b.cno1= c1.cno1
  LEFT JOIN categoryTwo c2
  ON b.cno2= c2.cno2
  WHERE b.bookID=${req.body.bookID}
  INTO OUTFILE '${MYSQL_OUTPUT_BASE}/${fileName}.csv'
  CHARACTER SET gbk 
  FIELDS TERMINATED BY ","  ESCAPED BY '' OPTIONALLY ENCLOSED  BY ''   LINES TERMINATED BY '\n';`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send({url:`${CSV_URL_BASE}/${fileName}.csv`})
    }
  });
});

//根据shareURL、shareCode，核验shareCode是否有效，并返回所有参数信息
app.post('/checkShareCode', (req, res) => {
  let sql = `select * from shareInfo where shareURL='${req.body.shareURL}' and shareCode='${req.body.shareCode}';`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//根据parameterStr、shareModel，生成shareURL和shareCode并返回
app.post('/newShareAdd', (req, res) => {
  let shareURL = Date.now().toString() + req.body.userID;
  let shareCode = Math.random().toString(36).slice(-6);
  let sql = `INSERT INTO shareInfo VALUES
  ('${shareURL}', '${req.body.parameterStr}','${req.body.userID}','${req.body.shareModel}','${shareCode}',NOW());
  select bookName from accountBook where bookID='${req.body.bookID}';
  select userName from userDetail where userID='${req.body.userID}';`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send({"shareURL":shareURL, "shareCode":shareCode, "bookName":data[1][0].bookName,"userName":data[2][0].userName});
    }
  });
});

//根据userID、bookID、day 获取用户名字和day的全天账单
app.post('/shareBillDetail', (req, res) => {
  let sql = `
  SELECT userName FROM userDetail WHERE userID=${req.body.userID};
  SELECT DATE_FORMAT(b.recordDate, '%Y-%m-%d') AS 'date', b.bid, b.bookID, b.outOrIn, b.editUserId, b.billName, c1.c1Name, c2.c2Name, b.price, DATE_FORMAT(b.createTime,'%Y-%m-%d %H:%i:%s') AS createTime
  FROM billDetail b
  LEFT JOIN categoryOne c1
  ON b.cno1= c1.cno1
  LEFT JOIN categoryTwo c2
  ON b.cno2= c2.cno2
  WHERE b.bookID=${req.body.bookID} AND b.recordDate LIKE '${req.body.day}';`
  selfMysql.bsDesignQuerypoll(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.send(err)
    } else {
      res.send(data)
    }
  });
});

//删除分享码
function deleteShareCode() {
  let sql1 = `DELETE FROM shareinfo WHERE DATE_SUB(CURDATE(), INTERVAL 7 DAY) >= DATE(createTime);`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    }else{
      console.log('已删除');
    }
  });

}

//自动创建账本和账本关系  所有新注册账号都会自动创建
function createBookDef(id) {
  let sql1 = `INSERT INTO accountBook VALUES
  (NULL, `+id+`, '默认账本', 0, 0, NULL);`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    }else{
      let sql2 = `INSERT INTO bookRelation VALUES
      (`+data.insertId+`, `+id+`, 1, 1, 1, 0, NULL);`
      selfMysql.bsDesignQuerypoll(sql2, function (err, data) {
        if (err) {
          console.log(err);
        }
      });
    }
  });
}

//将微信注册用户的头像保存到本地
function wxAvatarSave(id,src) {
  let saveUrl = `/userUpload/${id}.png`;
  request(src).pipe(
    // fs.createWriteStream(`./data/userAvatar/${id}.png`)
    fs.createWriteStream(`${AVATAR_URL_BASE}${saveUrl}`)
  );
  AvatarSaveInSQL(id, saveUrl)
}

//在mysql中保存头像路径
function AvatarSaveInSQL(userId, src, fn=function() {}) {
  let sql1 = `UPDATE userDetail SET avatarUrlPC='${src}' WHERE userID=${userId};`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      fn(data);
    }
  });
}



//测试
app.get('/test', (req, res) => {
  // res.send('ok')
  // createBookDef('1');
  // wxAvatarSave('def', 'https://thirdwx.qlogo.cn/mmopen/vi_32/Zhx75wicojEE2QEzBv7CLZL7ADzyo5rXJM5icLzvJDjvCzdHUPTmic32RoPKic3NTL3XDrH62epJ3qOUiaE4RWntf3A/132')
  // io.emit("push_data", timenow);

  //推送给指定用户
  // io.to(currentSocket[100000].socketID).emit("push_data", '1000nihao');

  // emitToNewDateInBook(1000, '所有打开bookid为1000的用户都收到了')
});






let currentSocket = {}
io.on('connection', (socket) => {
  console.log(socket.id + ' connected');
  
  //将socket.id 和userID、bookid绑定
  //主要是获取在线用户 现在选择的是什么账本
  socket.on('userInBook', data => {
    socket.selfUserID = data.userID;
    // console.log('客户端说：' + data);
    currentSocket[data.userID] = {"socketID":socket.id, "bookID":data.bookID};
    console.log(currentSocket);
  });

  socket.on("disconnect", (reason) => {
    console.log(socket.id + ' leave');
    delete currentSocket[socket.selfUserID]
    console.log(currentSocket);
  });

});



// 投机做法：直接引起首页刷新初始化函数
// 账单  新建、更新、删除都推送给关联用户，让他们的首页重新刷新
//推送给所有除了自己外 打开了billDetailPage 且是该账本 的用户
function emitToNewDateInBook (bookID, selfID) {
  let sql1 = `SELECT userID FROM bookRelation WHERE bookID=${bookID} AND isDelete=0 AND userID<>${selfID};`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      for(let i=0; i<data.length; i++) {
        let tpID = data[i].userID;
        if(tpID in currentSocket && bookID ==currentSocket[tpID].bookID) {
          //是该用户，且打开了账本
          io.to(currentSocket[tpID].socketID).emit("push_data", 'getBillByMonth');
        }
      }  
    }
  });
}

// 如果被邀请的用户在线，推送通知邀请用户加入账本
function emitToBeInviteUser(bookID, isWatcher, uuid) {
  let sql1 = `SELECT u.userName, b.bookName FROM (SELECT * FROM bookRelation WHERE bookID=${bookID} AND isCreater=1)uid, userdetail u, accountbook b WHERE uid.userID=u.userID AND b.bookID=${bookID};`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      let sendData = {"bookID":bookID}
      let msg = `${data[0].userName}邀请你加入<${data[0].bookName}>账本当`
      if(Boolean(isWatcher)) {
        msg += '观察者'
      }else {
        msg += '参与者'
      }
      sendData.msg = msg
      if(currentSocket[uuid]) {
        //在线就推送
        io.to(currentSocket[uuid].socketID).emit("push_book_invite", sendData);
      }
    }
  });
}

// 让邀请者的邀请界面刷新数据  无论被邀请者同意或者拒绝
function emitToInviteResult(bookID) {
  let sql1 = `SELECT * FROM bookRelation WHERE bookID=${bookID} AND isCreater=1;`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      if(currentSocket[data[0].userID]) {
        //在线就推送
        io.to(currentSocket[data[0].userID].socketID).emit("push_book_invite_result", 'refresh');
      }
    }
  });
}

//让被解除关系的用户界面刷新(切换到默认账本)
function emitToBeDeleteRelateUser(bookID, uuid) {
  let sql1 = `
  SELECT bookName, bookID FROM accountbook WHERE bookID=${bookID};
  SELECT bookID FROM bookrelation WHERE userID=${uuid} AND isCreater=1;`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      if(currentSocket[uuid]) {
        //在线就推送
        io.to(currentSocket[uuid].socketID).emit("push_book_beDelete", data);
      }
    }
  });
}

//让被关闭共享模式的用户界面刷新(切换到默认账本)
function emitToBeCloseShareUser(bookID) {
  let sql1 = `
  SELECT userID FROM bookrelation WHERE bookID=1000 AND isCreater<>1;
  SELECT bookName FROM accountbook WHERE bookID=${bookID};`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      for(let a=0; a<data[0].length; a++) {
        if(currentSocket[data[0][a].userID]) {
          //在线就推送
          // io.to(currentSocket[uuid].socketID).emit("push_book_closeShare", data);
          let sql2 = `SELECT bookID FROM bookrelation WHERE userID=${data[0][a].userID} AND isCreater=1;`
          selfMysql.bsDesignQuerypoll(sql2, function (err, dataaa) {
            if (err) {
              console.log(err);
            } else {
              let sendDataObj = {"closeBookName": data[1][0].bookName, "closeBookID":bookID, "defaultBookID": dataaa[0].bookID}
              io.to(currentSocket[data[0][a].userID].socketID).emit("push_book_closeShare", sendDataObj);
            }
          });

        }
      }
    }
  });
}

//让被改变权限的用户 重新检查权限
function emitToBeChangeRoleUser(bookid, uuid) {
  if(currentSocket[uuid] && currentSocket[uuid].bookID) {
    //是该用户，且打开了账本
    io.to(currentSocket[uuid].socketID).emit("push_book_reCheck_permissions", bookid);
  }
}





/*
* 老实做法 只推送更新了的数据
// 推送给所有除了自己外 打开了billDetailPage 且是该账本 的用户
function emitToNewDateInBook (bookID, newInsertID, selfID) {
  let sql1 = `SELECT userID FROM bookRelation WHERE bookID=${bookID} AND isDelete=0 AND userID<>${selfID};`
  selfMysql.bsDesignQuerypoll(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      let tpRelationUserIDArr = data;
      //获取新插入数据的具体信息
      let sql2 = `
      SELECT DATE_FORMAT(b.recordDate, '%Y-%m-%d') AS 'date', b.bid, b.bookID, b.outOrIn, b.editUserId, b.billName, c1.c1Name, c2.c2Name, b.price, DATE_FORMAT(b.createTime,'%Y-%m-%d %H:%i:%s') AS createTime
      FROM billDetail b
      LEFT JOIN categoryOne c1
      ON b.cno1= c1.cno1
      LEFT JOIN categoryTwo c2
      ON b.cno2= c2.cno2
      WHERE b.bid=${newInsertID};`
      selfMysql.bsDesignQuerypoll(sql2, function (err, data) {
        if (err) {
          console.log(err);
        } else {
          for(let i=0; i<tpRelationUserIDArr.length; i++) {
            let tpID = tpRelationUserIDArr[i].userID;
            if(tpID in currentSocket && bookID ==currentSocket[tpID].bookID) {
              //是该用户，且打开了账本
              io.to(currentSocket[tpID].socketID).emit("push_data", data[0]);
            }
          }    
        }
      });

    }
  });
}
*/





// io.on('connection', (socket) => {
//   // currentSocket.push({"socketID": socket.id})
//   console.log(socket.id + ' connected');
//   //将socket.id 和userID、bookid绑定
//   socket.on('bdInit', data => {
//     console.log('客户端说：' + data);
//     currentSocket[data.userID] = {"socketID":socket.id, "bookID":data.bookID};
//     // console.log(currentSocket);
//   });
//   socket.on("disconnect", (reason) => {
//     console.log(socket.id + ' leave');
//   });
//   socket.on('newPeople', data => {
//     // data 为接收的消息，前端发来的
//     console.log('客户端说：' + data)

//     // 广播消息，返回给前端的，'msg'为发送标志，要和前端接收的保持一致
//     // socket.broadcast.emit('msg',data)
//   });
// });

server.listen(442, () => {
  console.log('listening on *:442');
});
