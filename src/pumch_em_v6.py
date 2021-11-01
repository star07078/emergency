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
# import eel
import sys

# @eel.expose
def model_run(data_dict):
    
    model = CatBoostClassifier()
    model.load_model("src/triage_v6_notemp.model")

    # data_dict = {'triage level': ['ETS triage level-III'], 'age': [64], 'sex': ['M'], 'systolic blood pressure': [114],
    #    'diastolic blood pressure': [86], 'heart rate': [128], 'oxygen saturation': [99],
    #    'state of consciousness': ['conscious'], 'arrival mode': ['walk in'], 'arrival time': [23], 'shock index': [1.12280701754385],
    #    'pulse pressure': [28]}
    test_data_df = pd.DataFrame.from_dict(data_dict)

    #preds_prob = model.predict_proba(data=test_data)[1]

    explainer = shap.TreeExplainer(model)
    shap_values = explainer(test_data_df)
    preds_OR = np.round(np.power(np.e, sum(shap_values.values[0])), 2)

    if preds_OR < 8:
        print('No need to alarm.')
        return {"res":"No need to alarm."}
    else:
        # print('请呼叫二线')
        print('decision.png')
        shap.initjs()
        plt.title("Odds Ratio: {0}".format(preds_OR))
        shap.plots._waterfall.waterfall_legacy(0, shap_values.values[0], shap_values.data[0],
                                               feature_names=['triage level', 'age', 'sex', 'systolic blood pressure',
                                                              'diastolic blood pressure', 'heart rate', 'oxygen saturation',
                                                              'state of consciousness', 'arrival mode', 'arrival time',
                                                              'shock index','pulse pressure'],
                                               show=False)
        plt.tight_layout()
        plt.savefig("./public/decision.png")
        
        return {"res":"/decision.png"}

# test_data_dict = {'triage level': ['ETS triage level-III'], 'age': [64], 'sex': ['M'], 'systolic blood pressure': [114],
#        'diastolic blood pressure': [86], 'heart rate': [128], 'oxygen saturation': [99],
#        'state of consciousness': ['conscious'], 'arrival mode': ['walk in'], 'arrival time': [23], 'shock index': [1.12280701754385],
#        'pulse pressure': [28]}

dict = {}
print (sys.argv)
for i in range(1, len(sys.argv)):#这里参数从1开始
    key = sys.argv[i].split(":")[0]
    value=sys.argv[i].split(":")[1]
    if (i == 2  or i == 4 or i == 5 or i ==  6 or i ==  7 or i == 10 or i == 12):
        value = int(value)
    if (i == 11):
        value = float(value)
    dict[key] = [value] 
res = model_run(dict)
# print (res)
