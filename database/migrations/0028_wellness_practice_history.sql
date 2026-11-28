CREATE TABLE wellness_practice_history (
  user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL,
  item_id uuid NOT NULL,
  version integer NOT NULL,
  elapsed_seconds integer NOT NULL CHECK (elapsed_seconds > 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, attempt_id),
  FOREIGN KEY (item_id, version) REFERENCES wellness_publication_versions(item_id, version)
);
--> statement-breakpoint
CREATE INDEX wellness_practice_history_recent ON wellness_practice_history (user_id, completed_at DESC, attempt_id);
