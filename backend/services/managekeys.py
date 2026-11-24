import json
from pathlib import Path
from threading import RLock
from datetime import datetime, timezone


class ManageKeys:

    def __init__(self, file_path=None):
        self.file_path = (
            Path(file_path) if file_path else
            Path(__file__).resolve().parent.parent
            / "storage"
            / "credentials.json"
        )

        self.lock = RLock()
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

        if not self.file_path.exists():
            self.file_path.write_text(
                json.dumps({"accounts": []}, indent=4)
            )

    def _load(self):
        with self.lock:
            with open(self.file_path, "r") as file:
                return json.load(file)

    def _save(self, data):
        with self.lock:
            temp_file = self.file_path.with_suffix(".tmp")

            with open(temp_file, "w") as file:
                json.dump(data, file, indent=4)

            temp_file.replace(self.file_path)

    def add_account(self, account):

        data = self._load()
        account["date"] = datetime.now(timezone.utc).isoformat()
        data["accounts"].append(account)
        self._save(data)
        
    def get_accounts(self):
        data = self._load()
        if "accounts" not in data:
            data["accounts"] = []
            self._save(data)
        return data["accounts"]

    def update_account(self, key, updates):
        data = self._load()

        for account in data["accounts"]:
            if account["key"] == key:
                account.update(updates)
                self._save(data)
                return True

        return False

    def delete_account(self, key):
        data = self._load()

        original_count = len(data["accounts"])

        data["accounts"] = [
            account for account in data["accounts"]
            if account["key"] != key
        ]

        if len(data["accounts"]) == original_count:
            return False

        self._save(data)
        return True


manage_keys = ManageKeys()