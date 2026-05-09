
ALTER TABLE public.families
  ALTER COLUMN slug SET DEFAULT ('familia-' || substr(md5(random()::text || clock_timestamp()::text),1,8)),
  ALTER COLUMN kid_access_token SET DEFAULT replace(replace(encode(gen_random_bytes(18),'base64'),'/','_'),'+','-');
