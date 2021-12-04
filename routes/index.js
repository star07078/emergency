var express = require('express');
var router = express.Router();
var path = require("path");
// var play = require('play');
var WebSocket = require('ws');
var fs = require('fs');      // fs模块，用来保存语音文件
var ec = require('child_process')


//生成Excel依赖包
var xlsx = require('node-xlsx')



let wsd = null;
const ws = new WebSocket.Server({ port: 8081 }, () => {
  console.log('连接成功')
});
ws.on('connection', (data) => {
  wsd = data;
})

router.use(express.static('static'))

const { EDESTADDRREQ } = require('constants');
router.get('/', async (req, res) => {
  console.log('get');
  res.send('hello world')
})
router.post('/file', function(req, res) {
  let now = Date.now();
  var buffer = xlsx.build([{name: "mySheetName", data: req.body.file}]); 
  fs.appendFile(path.resolve(__dirname,`../static/xlsx/${now}.xlsx`), buffer, function (err) {
    if (err) {
        console.log(err, '保存excel出错')
    } else {
        console.log('写入excel成功!!!')
    }
  })

  // console.log(req.body.file);
  // fs.writeFile(path.resolve(__dirname, '../static/a.xlsx'), req.body.file)
  res.send({src: `http://127.0.0.1:3000/xlsx/${now}.xlsx`});
})
router.post('/getResult', async (req, res) => {
  console.log('post');
  let inputData = req.body;
  let level = getLevel(inputData);
  let str = '', audio = 'bjj';
  switch(level) {
    case 'ETS triage level-I':
      str = '危机';
      audio = 'wj';
      break;
    case 'ETS triage level-II':
      str = '危重';
      audio = 'wz';
      break;
    case 'ETS triage level-III':
      str = '紧急';
      audio = 'jj';
      break;
    case 'ETS triage level-IV':
      str = '不紧急';
      audio = 'bjj';
      break;
    default:
      str = '不紧急';
      audio = 'bjj';
  }
  if (level == 'ETS triage level-III' || level == 'ETS triage level-IV') {
    let arrivalMode = inputData.sourceOfPatient
    let shockIndex = (!inputData.systolicbloodpressure || !inputData.heartRate) ? -1 : (inputData.heartRate * 1.0 / inputData.systolicbloodpressure)
    let pulsePressure = (!inputData.systolicbloodpressure || !inputData.diastolicbloodpressure) ? -1 : (inputData.systolicbloodpressure - inputData.diastolicbloodpressure)
    let conscious = inputData.stateofconsciousness == "清醒" ? "conscious" : "altered mental status"
    var myDate = new Date();
    let arrivalTime = myDate.getHours()
    
    let test_data_dict = {
      'triage level': level, 'age': inputData.age, 'sex': inputData.sex, 'systolic blood pressure': inputData.systolicbloodpressure,
      'diastolic blood pressure': inputData.diastolicbloodpressure, 'heart rate': inputData.heartRate, 'oxygen saturation': inputData.oxygensaturation,
      'state of consciousness': conscious, 'arrival mode': arrivalMode, 'arrival time': arrivalTime, 'shock index': shockIndex,
      'pulse pressure': pulsePressure
    }
    // 异步执行
    ec.exec('python3 src/pumch_em_v6.py ' + JSON.stringify(test_data_dict), function (error, stdout, stderr) {
      if (error) {
        console.log('stderr : ' + stderr);
      }
      let decisionPath = stdout.split("\n")[0]
      setTimeout(()=>{
        ec.exec('termux-media-player play ' + path.resolve(__dirname, '../static/tixing.wav'))
        wsd.send(JSON.stringify({ status: 200, str, name: req.body.name, level: level, decisionPath }))
      },1000 * 5)
      res.json({ status: 200, level: level, decisionPath })
    })
  } else {
    setTimeout(()=>{
      ec.exec('termux-media-player play ' + path.resolve(__dirname, '../static/tixing.wav'))
      wsd.send(JSON.stringify({ status: 200,str, name: req.body.name, level: level }))
    },1000 * 5)
    res.json({ status: 200, level: level })
  }
})

let levels = [{ name: 'IV级(不紧急)', id: 'ETS triage level-IV' },
{ name: 'III级(紧急)', id: 'ETS triage level-III' },
{ name: 'II级(危重)', id: 'ETS triage level-II' },
{ name: 'I级(危机)', id: 'ETS triage level-I' }]

function getLevel(data) {
  data = data
  if ((data.patientMainSuit && data.patientMainSuit.other && data.patientMainSuit.other.indexOf("心跳骤停") != -1)
    || data.heartRate > 160 || data.heartRate < 40
    || data.systolicbloodpressure > 220 || data.systolicbloodpressure < 60
    || (data.oxygensaturation < 85 && data.anamnesis != "COPD")
    || (data.oxygensaturation < 80 && data.anamnesis == "COPD")
    || data.temperature > 41
    || data.stateofconsciousness == '昏迷'
    || data.isCompoundInjury == true
    || data.remark.indexOf("心梗") != -1
  ) {
    return "ETS triage level-I"
  }
  if ((data.heartRate <= 160 && data.heartRate > 140)
    || (data.heartRate < 50 && data.heartRate >= 40)
    || (data.systolicbloodpressure <= 220 && data.systolicbloodpressure > 200)
    || (data.systolicbloodpressure >= 60 && data.systolicbloodpressure < 80)
    || (data.oxygensaturation >= 85 && data.oxygensaturation < 90 && data.anamnesis != "COPD")
    || (data.oxygensaturation >= 80 && data.oxygensaturation < 85 && data.anamnesis == "COPD")
    || (data.heartRate * 1.0 / data.systolicbloodpressure > 1.2)
    || data.stateofconsciousness == '昏睡'
    || (data.patientMainSuit && (data.patientMainSuit.breath && data.patientMainSuit.breath.indexOf("呼吸困难") != -1)
      && (data.patientMainSuit.loop && data.patientMainSuit.loop.indexOf("胸痛") != -1))
    || ((data.patientMainSuit && ((data.patientMainSuit.digest &&
      (data.patientMainSuit.digest.indexOf("呕血") != -1 || data.patientMainSuit.digest.indexOf("黑便") != -1)
    ) || (data.patientMainSuit.other &&
      (data.patientMainSuit.other.indexOf("外伤") != -1 || data.patientMainSuit.other.indexOf("多发伤") != -1))
    )) && data.systolicbloodpressure < 90)
  ) {
    return 'ETS triage level-II'
  }

  if ((data.heartRate <= 140 && data.heartRate > 120)
    || (data.heartRate < 55 && data.heartRate >= 50)
    || (data.systolicbloodpressure <= 200 && data.systolicbloodpressure > 180)
    || (data.systolicbloodpressure >= 80 && data.systolicbloodpressure < 90)
    || (data.oxygensaturation >= 90 && data.oxygensaturation < 95 && data.anamnesis != "COPD")
    || (data.oxygensaturation >= 85 && data.oxygensaturation < 95 && data.anamnesis == "COPD")
    || (data.heartRate * 1.0 / data.systolicbloodpressure <= 1.2 && data.heartRate * 1.0 / data.systolicbloodpressure >= 0.8)
    || data.stateofconsciousness == '嗜睡'
  ) {
    return 'ETS triage level-III'
  }

  if ((data.heartRate >= 55 && data.heartRate <= 120)
    || (data.systolicbloodpressure <= 180 && data.systolicbloodpressure >= 90)
    || (data.heartRate * 1.0 / data.systolicbloodpressure < 0.8)
  ) {
    return 'ETS triage level-IV'
  }
}

module.exports = router;
