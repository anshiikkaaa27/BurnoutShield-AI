import pandas as pd

df = pd.read_csv("Dataset/student_mental_health_burnout.csv")

for col in df.columns:
    print(f"\n{col}")
    print(df[col].head())
    print("dtype:", df[col].dtype)