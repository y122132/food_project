import torch

ckpt = torch.load("../checkpoints_convnext_stratified/best_model.pt", map_location="cpu")
print(ckpt.keys())
