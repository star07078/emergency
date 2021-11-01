var express = require('express');
var router = express.Router();
var path = require("path");
var xlsx = require('node-xlsx');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express hello' });
});
const exec = require('child_process').exec;
router.post('/getResult', async (req, res) => {
    console.log("data", req.body)
    let inputData = req.body
    let level = getLevel(inputData)
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
        exec('python3 src/pumch_em_v6.py ' + JSON.stringify(test_data_dict), function (error, stdout, stderr) {
            console.log('over 1')
            if (error) {
                console.log('stderr : ' + stderr);
            }
            console.log('exec111: ' + stdout);
            let decisionPath = stdout.split("\n")[0]
            return res.json({ status: 200, level: level, decisionPath })
        })
    } else {
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

setTimeout(async function () {
    // let test_data_dict = {
    //     'triage level': level, 'age': inputData.age, 'sex': inputData.sex, 'systolic blood pressure': inputData.systolicbloodpressure,
    //     'diastolic blood pressure': inputData.diastolicbloodpressure, 'heart rate': inputData.heartRate, 'oxygen saturation': inputData.oxygensaturation,
    //     'state of consciousness': conscious, 'arrival mode': arrivalMode, 'arrival time': arrivalTime, 'shock index': shockIndex,
    //     'pulse pressure': pulsePressure
    //   }
    // 异步执行
    //   exec('python3 src/pumch_em_v7.py', function (error, stdout, stderr) {
    //     console.log('over 1')
    //     if (error) {
    //       console.log('stderr : ' + stderr);
    //     }
    //     console.log('exec111: ' + stdout);
    //   })

    // real_value_list = ['ETS triage level-III', 64, 'M', 114, 86, 128, 99,
    //    'conscious', 'walk in', 23, 1.12, 28]
    let test_data_dict = {
        'triage level': 'ETS triage level-III', 'age': 64, 'sex': 'M', 'systolic blood pressure': 114,
        'diastolic blood pressure': 86, 'heart rate': 128, 'oxygen saturation': 99,
        'state of consciousness': 'conscious', 'arrival mode': 'walk in', 'arrival time': 23, 'shock index': 1.12,
        'pulse pressure': 28
    }
    // let test_data_dict = ['ETS triage level-III', 64, 'M', 114, 86, 128, 99,
    // 'conscious', 'walk in', 23, 1.12, 28]
    // 异步执行
    exec('python3 src/pumch_em_v7.py ' + JSON.stringify(test_data_dict), function (error, stdout, stderr) {
        console.log('over 1')
        if (error) {
            console.log('stderr : ' + stderr);
        }
        console.log('exec111: ' + stdout);
        if (stdout.indexOf('output_values') > -1) {
            //读取excel返回数据  
            var obj = xlsx.parse('output_values.csv');
            let allData = obj[0].data
            let result = []
            for (let i = 1; i < allData.length; i ++){
                let info = allData[i];
                result.push(info[3])
            }
            console.log(JSON.stringify(result)) 
        }
        // let decisionPath = stdout.split("\n")[0]
        // return res.json({ status: 200,level:level, decisionPath})
    })
}, 1000)

module.exports = router;
