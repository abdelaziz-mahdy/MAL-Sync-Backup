from datetime import datetime
from pathlib import Path
from shlex import split
import json as json
import tqdm as tqdm
myAnimeListDir = Path("./myanimelist/anime")
gogoAnimeDir = Path("./pages/gogoanime")
Map={}
for file in tqdm.tqdm(list(myAnimeListDir.iterdir())):
    if file.is_file():

        extension = file.suffix
        old_name = file.stem
        if "_index" != old_name:
            data = json.loads(file.read_bytes())
            #print(data)

            english_name=None
            if("Zoro" in data["Pages"]):
                english_name=data["Pages"]["Zoro"][list(data["Pages"]["Zoro"].keys())[0]]["title"]
            else:
                if len(data["altTitle"])!=0:
                    english_name=data["altTitle"][0]
            gogo_link=None

            if("Gogoanime" in data["Pages"]):
                for key in list(data["Pages"]["Gogoanime"].keys()):
                    if "dub" not in key.lower():
                        gogo_link=key

            if gogo_link:
                Map[data["id"]]={
                    "japanese_name":data["title"],
                    "english_name":english_name,
                    "image":data["image"],
                    "gogo_link":gogo_link
                }
                Map[gogo_link]={
                    "japanese_name":data["title"],
                    "english_name":english_name,
                    "image":data["image"],
                    "malid":data["id"]
                }
            
        #print(Map)
out_file = open("mapping.json", "w")
print(len(Map))
json.dump(Map,out_file)
