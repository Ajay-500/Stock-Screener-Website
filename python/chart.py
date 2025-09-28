import json
import pandas as pd
import matplotlib.pyplot as plt
import io
import base64
import numpy as np

plt.rcParams.update({
    'font.family': 'sans-serif',
    'figure.facecolor': '#2c3241',
    'axes.facecolor': '#2c3241',
    'text.color': '#e0e0e0',
    'axes.labelcolor': '#e0e0e0',
    'xtick.color': '#e0e0e0',
    'ytick.color': '#e0e0e0',
})

screened_data_js = globals().get("screened_data_json")
full_data_js = globals().get("full_data_json")
metric = globals().get("metric")
selected_sectors = globals().get("selected_sectors").to_py()

screened_df = pd.DataFrame(json.loads(screened_data_js))
full_df = pd.DataFrame(json.loads(full_data_js))

metric_labels = {'pe': 'P/E Ratio', 'pb': 'P/B Ratio', 'de': 'Debt/Equity (%)', 'roe': 'ROE (%)'}

title_text = f'{metric_labels.get(metric, "")} Comparison'
if len(selected_sectors) == 1:
    title_text += f' for {selected_sectors[0]} Sector'
elif len(selected_sectors) > 1:
    title_text += f' for {len(selected_sectors)} Selected Sectors'
else:
    title_text += ' for FTSE 250'

if len(selected_sectors) > 0:
    industry_df = full_df[full_df['sector'].isin(selected_sectors)]
else:
    industry_df = full_df

average_value = industry_df[metric].mean()

fig, ax = plt.subplots(figsize=(15, 6))

colors = plt.cm.get_cmap('tab10', len(screened_df))
bars = ax.bar(screened_df['ticker'], screened_df[metric], color=[colors(i) for i in range(len(screened_df))])

ax.bar_label(bars, fmt='%.2f', padding=3, color='#e0e0e0', fontsize=9)

if average_value is not None and not np.isnan(average_value):
    ax.axhline(y=average_value, color='#ff6b6b', linestyle='--', linewidth=2, label=f'Industry Average: {average_value:.2f}')

ax.set_title(title_text, fontsize=16, pad=20, color='#ffffff')
ax.set_ylabel(metric_labels.get(metric, ''), fontsize=12)
ax.tick_params(axis='x', rotation=45, labelsize=10)

ax.grid(axis='y', linestyle='--', color='#e0e0e0', alpha=0.3)
for spine in ax.spines.values():
    spine.set_visible(False)

ax.legend(facecolor='#1a1e2b', edgecolor='none')

fig.tight_layout()

buf = io.BytesIO()
fig.savefig(buf, format='png', facecolor=fig.get_facecolor())
buf.seek(0)
img_base64 = base64.b64encode(buf.read()).decode('utf-8')
buf.close()
plt.close(fig)

img_base64

