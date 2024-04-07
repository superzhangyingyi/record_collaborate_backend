CREATE DATABASE IF NOT EXISTS `bsDesign` CHARACTER SET 'utf8' COLLATE 'utf8_general_ci'; 
USE bsDesign;

 CREATE TABLE IF NOT EXISTS userDetail (
  userID INT PRIMARY KEY AUTO_INCREMENT,
  userName VARCHAR(20),
  userPassword VARCHAR(20),
  phone VARCHAR(20) UNIQUE,
  wechatOpenid VARCHAR(30),
  avatarUrlPC VARCHAR(60),
  RegistrantTime TIMESTAMP default CURRENT_TIMESTAMP
)ENGINE=INNODB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8;

INSERT INTO userDetail VALUES
(NULL, 'KID1412', '111', '000', 'oRrdQt4iYT4oO4rIYDF8QprqDeRQ','/def/1.png', NULL),
(NULL, 'apkk', '111', '111', NULL, NULL, NULL),
(NULL, '123', '111', '222', 'fw_zyy', 'userUpload/1000003.png', NULL),
(NULL, '超级无敌小黄狗哈哈哈哈哈哈哈哈', NULL, NULL, 'sdds', 'def/2.png', NULL);

 CREATE TABLE IF NOT EXISTS accountBook (
  bookID INT PRIMARY KEY AUTO_INCREMENT,
  createrID INT NOT NULL,
  bookName VARCHAR(20) NOT NULL,
  isShare TINYINT DEFAULT 0 NOT NULL,
  isDelete TINYINT NOT NULL,
  createTime TIMESTAMP
)ENGINE=INNODB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8;

INSERT INTO accountBook VALUES
(NULL, 100000, '小黄狗的日常账本', 0, 0, NULL),
(NULL, 100000, '小狗日常账本2', 0, 0, NULL),
(NULL, 100001, 'apkk的日常账本', 1, 0, NULL);

 CREATE TABLE IF NOT EXISTS bookRelation (
  bookID INT NOT NULL,
  userID INT NOT NULL,
  isCreater TINYINT NOT NULL,
  isAgree TINYINT NOT NULL,
  isWrite TINYINT NOT NULL,
  isDelete TINYINT NOT NULL,
  createTime TIMESTAMP
)ENGINE=INNODB DEFAULT CHARSET=utf8;

INSERT INTO bookRelation VALUES
(1000, 100000, 1, 1, 1, 0, NULL),
(1001, 100000, 1, 1, 1, 0, NULL),
(1002, 100001, 1, 1, 1, 0, NULL),
(1000, 100001, 0, 1, 1, 0, NULL),
(1002, 100000, 0, 1, 0, 0, NULL),
(1000, 100002, 0, 1, 0, 0, NULL);

 CREATE TABLE IF NOT EXISTS categoryOne (
  bookID INT NOT NULL,
  cno1 INT PRIMARY KEY AUTO_INCREMENT,
  outOrIn TINYINT DEFAULT 0 NOT NULL,
  c1Name VARCHAR(20) NOT NULL,
  c1IcoUnicode VARCHAR(20) NOT NULL,
  isDelete TINYINT DEFAULT 0,
  createTime TIMESTAMP
)ENGINE=INNODB DEFAULT CHARSET=utf8;

 CREATE TABLE IF NOT EXISTS categoryTwo (
  cno1 INT NOT NULL,
  cno2 INT PRIMARY KEY AUTO_INCREMENT,
  c2Name VARCHAR(20) NOT NULL,
  c2IcoUnicode VARCHAR(20) NOT NULL,
  isDelete TINYINT default 0,
  createTime TIMESTAMP
)ENGINE=INNODB DEFAULT CHARSET=utf8;

INSERT INTO categoryOne VALUES
(1000, NULL, 0, '餐饮', '&#xe714;', 0, NULL),
(1000, NULL, 0, '消费', '&#xe64f;', 0, NULL),
(1000, NULL, 0, '购物', '&#xe70f;', 0, NULL),
(1000, NULL, 1, '收入', '&#xe64d;', 0, NULL),
(1000, NULL, 0, '生活', '&#xe646;', 0, NULL),
(1000, NULL, 0, '单一级', '&#xe649;', 0, NULL),
(1001, NULL, 0, '其他人的1', '&#xe649;', 0, NULL),
(1001, NULL, 0, '其他人的2', '&#xe649;', 0, NULL),
(1001, NULL, 0, '其他人的3', '&#xe649;', 0, NULL),
(1000, NULL, 0, '旅行', '&#xe651;', 0, NULL),
(1000, NULL, 0, '单一级2', '&#xe649;', 0, NULL);


INSERT INTO categoryTwo VALUES
(1, NULL, '早饭', '&#xe6e9;', 0, NULL),
(1, NULL, '午饭', '&#xe6e8;', 0, NULL),
(1, NULL, '热狗', '&#xe600;', 0, NULL),
(1, NULL, '蛋糕', '&#xe601;', 0, NULL),
(1, NULL, '汉堡', '&#xe644;', 0, NULL),
(1, NULL, '糖果', '&#xebcd;', 0, NULL),
(1, NULL, '饮料', '&#xebd3;', 0, NULL),
(1, NULL, '苹果', '&#xebed;', 0, NULL),
(1, NULL, '面条', '&#xe90d;', 0, NULL),
(7, NULL, '2级1-1', '&#xe698;', 0, NULL),
(8, NULL, '2级2-1', '&#xe698;', 0, NULL),
(8, NULL, '2级2-2', '&#xe698;', 0, NULL),
(9, NULL, '2级3-1', '&#xe698;', 0, NULL),
(9, NULL, '2级3-2', '&#xe698;', 0, NULL),
(9, NULL, '2级3-3', '&#xe698;', 0, NULL),
(2, NULL, '健身', '&#xe65d;', 0, NULL),
(2, NULL, '干洗', '&#xe67d;', 0, NULL),
(2, NULL, '亲子', '&#xe68c;', 0, NULL),
(2, NULL, '人文', '&#xe68d;', 0, NULL),
(2, NULL, '维修', '&#xe641;', 0, NULL),
(2, NULL, '清洁', '&#xe617;', 0, NULL),
(2, NULL, '宠物', '&#xe64b;', 0, NULL),
(2, NULL, '送礼', '&#xe6e4;', 0, NULL),
(3, NULL, '奢侈品', '&#xe6de;', 0, NULL),
(3, NULL, '口红', '&#xe63b;', 0, NULL),
(3, NULL, '鞋子', '&#xe648;', 0, NULL),
(3, NULL, '衣服', '&#xe64c;', 0, NULL),
(3, NULL, '美妆', '&#xe603;', 0, NULL),
(3, NULL, '电子产品', '&#xe692;', 0, NULL),
(4, NULL, '工资', '&#xe65b;', 0, NULL),
(4, NULL, '奖金', '&#xe6d1;', 0, NULL),
(4, NULL, '积蓄', '&#xe6dd;', 0, NULL),
(5, NULL, '电费', '&#xe65f;', 0, NULL),
(5, NULL, '网费', '&#xe66c;', 0, NULL),
(5, NULL, '话费', '&#xe634;', 0, NULL),
(10, NULL, '景点', '&#xe645;', 0, NULL),
(10, NULL, '住宿', '&#xe646;', 0, NULL),
(10, NULL, '停车', '&#xe66b;', 0, NULL),
(10, NULL, '户外', '&#xe687;', 0, NULL),
(10, NULL, '计程车', '&#xe688;', 0, NULL),
(10, NULL, '巴士', '&#xe70d;', 0, NULL),
(10, NULL, '飞机', '&#xe70e;', 0, NULL),
(10, NULL, '火车', '&#xe710;', 0, NULL),
(10, NULL, '轮船', '&#xe712;', 0, NULL);


 CREATE TABLE IF NOT EXISTS billDetail (
  bid INT PRIMARY KEY AUTO_INCREMENT,
  bookID INT NOT NULL,
  outOrIn TINYINT NOT NULL,
  editUserId INT NOT NULL,
  billName VARCHAR(40),
  cno1 INT NOT NULL,
  cno2 INT,
  price DECIMAL(10,2) NOT NULL,
  recordDate DATE NOT NULL,
  createTime TIMESTAMP
)ENGINE=INNODB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8;

INSERT INTO billDetail values
('1000','1000','0','100000','话费5125','5','35','-30.00','2023-02-11','2023-02-26 13:51:04'),
('1001','1000','0','100000','通心粉500g','1','9','-8.90','2022-02-14','2023-02-26 13:51:04'),
('1002','1000','0','100000','意大利面2KG','1','9','-26.85','2023-02-14','2023-02-26 13:51:04'),
('1003','1000','0','100000','苹果','3',NULL,'-12.80','2023-02-13','2023-02-26 13:51:04'),
('1004','1000','0','100000','橘子','1','8','-13.60','2023-02-11','2023-02-26 17:32:28'),
('1005','1000','0','100000','豆腐','1',NULL,'-8.90','2023-02-17','2023-02-26 17:31:50'),
('1006','1000','0','100000','毛绒狗仔','2','22','-1000.00','2023-02-01','2023-02-26 17:30:03'),
('1007','1000','0','100000','电脑','3',NULL,'-8999.00','2023-02-18','2023-02-26 13:51:04'),
('1008','1000','0','100000','棉签','5','35','-5.90','2023-02-14','2023-02-26 13:51:04'),
('1009','1000','0','100000','鲜牛奶','1','7','-12.80','2023-02-12','2023-02-26 18:01:08'),
('1010','1000','0','100000','铁板鱿鱼丝','1','9','-20.00','2023-02-23','2023-02-26 13:51:04'),
('1011','1000','0','100000','豆浆粉','3',NULL,'-13.56','2023-02-21','2023-02-26 13:51:04'),
('1012','1000','0','100000','服务器续费','5','35','-120.00','2023-02-20','2023-02-26 13:51:04'),
('1013','1000','0','100000','遥控汽车','1','9','-48.90','2023-02-14','2023-02-26 13:51:04'),
('1014','1000','1','100000','开工利是','4','31','1000.00','2023-02-13','2023-02-26 17:33:52'),
('1015','1001','0','100000','多肉','7','10','-5.00','2023-02-02','2023-02-26 17:30:54'),
('1016','1000','0','100000','盆栽','3',NULL,'-30.00','2023-02-08','2023-02-26 13:51:04'),
('1017','1000','0','100000','裤子','5','35','-80.00','2023-01-11','2023-02-26 13:51:04'),
('1018','1000','0','100000','核桃','1','9','-26.85','2023-01-11','2023-02-26 13:51:04'),
('1019','1000','0','100000','烧鸭','1','9','-59.90','2023-01-17','2023-02-26 13:51:04'),
('1020','1000','0','100000','小恶魔羊毛羔外套','3',NULL,'-239.00','2023-01-30','2023-02-26 13:51:04');

 CREATE TABLE IF NOT EXISTS listBook (
  listBookId INT PRIMARY KEY AUTO_INCREMENT,
  createrId INT NOT NULL,
  listName VARCHAR(30) NOT NULL,
  startTime DATE,
  createTime TIMESTAMP
)ENGINE=INNODB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8;

INSERT INTO listBook VALUES
(NULL, 100000, '购物清单zyy', NULL, NULL),
(NULL, 100000, '购物清单22zyy', '2023-2-1', NULL),
(NULL, 100000, '清单339', '2023-02-04', NULL);

CREATE TABLE IF NOT EXISTS listRelation (
  listBookId INT NOT NULL,
  userId INT NOT NULL,
  createTime TIMESTAMP
)ENGINE=INNODB DEFAULT CHARSET=utf8;

INSERT INTO listRelation VALUES
(1000, 100000, NULL);

 CREATE TABLE IF NOT EXISTS listDetail (
  goodId INT PRIMARY KEY AUTO_INCREMENT,
  listBookId INT NOT NULL,
  goodName VARCHAR(30) NOT NULL,
  remark VARCHAR(60),
  allocatedUserId INT,
  isFinish TINYINT DEFAULT 0,
  finishTime  DATETIME,
  finishUserId INT,
  createTime TIMESTAMP
)ENGINE=INNODB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8;

INSERT INTO listDetail VALUES
(NULL, 1000, '棉签','备注：速速买来', NULL, 0, NULL, NULL, NULL),
(NULL, 1000, '酒精','备注：由我去买', 100000, 0, NULL, NULL, NULL),
(NULL, 1000, '水果', NULL, 100000, 1, NULL, NULL, NULL),
(NULL, 1000, '面条','finish', 100000, 2, NOW(), 100000, NULL);
