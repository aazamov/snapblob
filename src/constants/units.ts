export enum DataSize {
  B = 1,

  KB = B * 1000,
  MB = KB * 1000,
  GB = MB * 1000,
  TB = GB * 1000,

  KiB = B * 1024,
  MiB = KiB * 1024,
  GiB = MiB * 1024,
  TiB = GiB * 1024,
}

export enum BitrateUnit {
  BPS = 1,
  KBS = BPS * 1000,
  MBS = KBS * 1000,
  GBS = MBS * 1000,
}

export enum StreamDuration {
  SECOND = 1,
  MINUTE = SECOND * 60,
  HOUR = MINUTE * 60,
}
