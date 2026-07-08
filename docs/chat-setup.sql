-- Run this in the Supabase SQL editor to set up the messages table for chat.

CREATE TABLE public.messages (
  message_id uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid        NOT NULL REFERENCES public.teams(team_id)   ON DELETE CASCADE,
  player_id  uuid        NOT NULL REFERENCES public.players(player_id) ON DELETE CASCADE,
  full_name  text        NOT NULL,
  body       text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only members of the same team can read messages
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (team_id = (SELECT team_id FROM public.players WHERE player_id = auth.uid()));

-- Members can only insert their own messages into their own team
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND team_id = (SELECT team_id FROM public.players WHERE player_id = auth.uid())
  );

-- Enable realtime so subscribers receive new messages instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
