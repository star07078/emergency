var express = require('express');
var router = express.Router();
var path = require("path");
var WebSocket = require('ws');


let wsd = null;

const ws = new WebSocket.Server({ port: 8081 }, () => {
  console.log('连接成功')
});
ws.on('connection', (data) => {
  wsd = data;
})

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express hello' });
});
const ec = require('child_process')

router.post('/getResult', async (req, res) => {
  let inputData = req.body;
  let level = getLevel(inputData);
  let str = '';
  switch(level) {
    case 'ETS triage level-I':
      str = '危机';
      break;
    case 'ETS triage level-II':
      str = '危重';
      break;
    case 'ETS triage level-III':
      str = '紧急';
      break;
    case 'ETS triage level-IV':
      str = '不紧急';
      break;
    default:
      str = '不紧急';
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
      wsd.send(JSON.stringify({ status: 200, name: req.body.name, level: level, decisionPath }))
      setTimeout(()=>{
        ec.exec('termux-tts-speak '+req.body.name+str)
        console.log(111);
      },5000)
      // audio(req.body.name, { status: 200, name: req.body.name, level: level, decisionPath }, str)
      return res.json({ status: 200, level: level, decisionPath })
    })
  } else {
    wsd.send(JSON.stringify({ status: 200, name: req.body.name, level: level }))
    setTimeout(()=>{
      ec.exec('termux-tts-speak '+req.body.name+str)
      console.log(222);
    },5000)
    return res.json({ status: 200, level: level })
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
