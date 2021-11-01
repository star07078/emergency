import numpy as np
import pandas as pd
import seaborn as sns
import datetime
from matplotlib.font_manager import FontProperties
import matplotlib as mpl
mpl.rcParams['savefig.dpi'] = 300 #图片像素
mpl.rcParams['figure.dpi'] = 300 #分辨率
mpl.rcParams['font.sans-serif'] = ['SimHei']
mpl.rcParams['axes.unicode_minus']=False
import matplotlib.pyplot as plt
import shap
from catboost import *
import json
import sys

def model_run(test_data_dict):
    model = CatBoostClassifier()
    model.load_model("src/triage_v6_notemp.model")

    # test_data_dict = {'triage level': ['ETS triage level-III'], 'age': [64], 'sex': ['M'], 'systolic blood pressure': [114],
    #    'diastolic blood pressure': [86], 'heart rate': [128], 'oxygen saturation': [99],
    #    'state of consciousness': ['conscious'], 'arrival mode': ['walk in'], 'arrival time': ['23'], 'shock index': [1.12280701754385],
    #    'pulse pressure': [28]}
    test_data_df = pd.DataFrame.from_dict(test_data_dict)

    #preds_prob = model.predict_proba(data=test_data)[1]

    explainer = shap.TreeExplainer(model)
    shap_values = explainer(test_data_df)
    preds_OR = np.round(np.power(np.e, sum(shap_values.values[0])), 2)

    c_list = ['初始分级', '年龄', '性别', '收缩压', '舒张压', '心率', '指氧饱和度',
              '意识状态', '病人来源', '分诊时刻(时)', '休克指数', '脉压差']
    # real_value_list = ['ETS triage level-III', 64, 'M', 114, 86, 128, 99,
    #                    'conscious', 'walk in', 23, 1.12, 28]

    real_value_list = [test_data_dict.get('triage level'),
            test_data_dict.get('age'),
            test_data_dict.get('sex'),
            test_data_dict.get('systolic blood pressure'),
            test_data_dict.get('diastolic blood pressure'),
            test_data_dict.get('heart rate'),
            test_data_dict.get('oxygen saturation'),
            test_data_dict.get('state of consciousness'),
            test_data_dict.get('arrival mode'),
            test_data_dict.get('arrival time'),
            test_data_dict.get('shock index'),
            test_data_dict.get('pulse pressure')]
                       
    or_list = [np.round(np.power(np.e, x), 2) for x in shap_values.values[0]]
    shap_list = [np.round(x, 2) for x in shap_values.values[0]]
    output_dict = {'feature_name': c_list, 'real_value': real_value_list, 'OR': or_list, 'SHAP_value': shap_list}
    output_df = pd.DataFrame.from_dict(output_dict)
    output_df.sort_values('OR', ascending=False, inplace=True)

    if preds_OR < 8:
        print('No need to alarm.')
    else:
        print('output_values.csv')
        print('OR: {0}'.format(preds_OR))
        output_df.to_csv('./output_values.csv', sep=',', index=False, encoding='gbk')


# if __name__ == '__main__':
#     model_run()
dict = {}
for i in range(1, len(sys.argv)):#这里参数从1开始
    key = sys.argv[i].split(":")[0]
    value=sys.argv[i].split(":")[1]
    if (i == 2  or i == 4 or i == 5 or i ==  6 or i ==  7 or i == 10 or i == 12):
        value = int(value)
    if (i == 11):
        value = float(value)
    dict[key] = [value] 
res = model_run(dict)