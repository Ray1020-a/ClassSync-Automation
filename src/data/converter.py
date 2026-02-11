import pandas as pd
import json
import os
from datetime import datetime

def class_convert(input, output):
    try:
        xls = pd.read_excel(input, sheet_name=None, usecols="A,D,H,I", nrows=60, header=None)
        
        output_data = {}

        for sheet_name, df in xls.items():
            if df.empty:
                continue

            if len(df.columns) == 4:
                df.columns = ["Time", "Section", "Part_H", "Part_I"]
            else:
                continue

            df = df.dropna(subset=["Time"]).copy()

            def convert_time_to_str(val):
                if pd.isnull(val):
                    return ""
                if isinstance(val, (pd.Timestamp, datetime)):
                    if val.hour == 0 and val.minute == 0 and val.second == 0:
                        return val.strftime('%Y-%m-%d')
                    else:
                        return val.strftime('%Y-%m-%d %H:%M:%S')
                return str(val)

            df["Time"] = df["Time"].apply(convert_time_to_str)
            df["Section"] = pd.to_numeric(df["Section"], errors='coerce').fillna(0).astype(int)
            df["Part_H"] = df["Part_H"].fillna("").astype(str)
            df["Part_I"] = df["Part_I"].fillna("").astype(str)
            df["Location"] = df["Part_H"] + "_" + df["Part_I"]

            final_df = df[["Time", "Section", "Location"]]
            sheet_data = final_df.to_dict(orient='records')
            output_data[sheet_name] = sheet_data

        with open(output, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=4)

        print(f"轉換成功！已儲存至 {output}")

    except Exception as e:
        print(f"發生錯誤: {e}")

def student_convert(input, output):
    try:
        df = pd.read_excel(input, header=None)

        result = {}

        for index, row in df.iterrows():
            student_id = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else None

            if not student_id or student_id == 'nan':
                continue

            name = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""

            classes_raw = row.iloc[2:24].dropna().tolist()

            classes = [str(c).strip() for c in classes_raw if str(c).strip() != ""]

            result[student_id] = {
                "name": name,
                "class": classes
            }

        with open(output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=4)

        print(f"轉換成功！已儲存至 {output} ( {len(result)} 筆資料)")

    except Exception as e:
        print(f"發生錯誤: {e}")

if __name__ == "__main__":
    input_xlsx = f"{input('請輸入 Excel 檔名（不含副檔名）: ')}.xlsx"
    output_json = f"{input_xlsx.split('.')[0]}.json"
    
    if os.path.exists(input_xlsx):
        mode = input("請選擇轉換模式\n1 課程表\n2 學生資料\n輸入模式 (1 或 2): ")
        if mode == "1":
            class_convert(input_xlsx, output_json)
        elif mode == "2":
            student_convert(input_xlsx, output_json)
        else:
            print("無效的模式選擇！請輸入 1 或 2。")
    else:
        print(f"找不到檔案: {input_xlsx}")