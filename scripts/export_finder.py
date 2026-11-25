"""Export Chatbot/data.pth and intents.json to frontend/finder-model.json.

Run from the repo root after retraining the chatbot: python scripts/export_finder.py
"""
import json
import torch

data = torch.load("Chatbot/data.pth", weights_only=True, map_location="cpu")
state = data["model_state"]
with open("Chatbot/intents.json", encoding="utf-8") as f:
    intents = json.load(f)["intents"]

out = {
    "words": data["all_words"],
    "tags": data["tags"],
    "layers": [[state[f"{l}.weight"].tolist(), state[f"{l}.bias"].tolist()] for l in ("l1", "l2", "l3")],
    "responses": {i["tag"]: i["responses"] for i in intents},
}
with open("frontend/finder-model.json", "w", encoding="utf-8") as f:
    json.dump(out, f, separators=(",", ":"))
print("wrote frontend/finder-model.json")
