# model_manager.py

import os

import joblib

MODEL_DIR = "models"


def get_model_path(model_name):
    return os.path.join(MODEL_DIR, f"{model_name}.pkl")


def model_exists(model_name):
    return os.path.exists(get_model_path(model_name))


def save_model(model, model_name):

    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    joblib.dump(model, get_model_path(model_name))


def load_model(model_name):

    path = get_model_path(model_name)

    if not os.path.exists(path):
        return None

    return joblib.load(path)
