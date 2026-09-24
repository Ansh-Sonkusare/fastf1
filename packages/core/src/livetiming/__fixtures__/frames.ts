// Recorded from wss://livetiming.formula1.com/signalrcore during Baku FP2 on 2026-09-24.
export const frames = {
  handshake: "{}\u001e",
  subscribeResult:
    '{"type":3,"invocationId":"0","result":{"Heartbeat":{"Utc":"2026-09-24T12:54:30.679687Z","_kf":true},"SessionInfo":{"Meeting":{"Key":1295,"Name":"Azerbaijan Grand Prix","OfficialName":"FORMULA 1 QATAR AIRWAYS AZERBAIJAN GRAND PRIX 2026","Location":"Baku","Number":15,"Country":{"Key":30,"Code":"AZE","Name":"Azerbaijan"},"Circuit":{"Key":144,"ShortName":"Baku"}},"SessionStatus":"Started","ArchiveStatus":{"Status":"Generating"},"Key":11371,"Type":"Practice","Number":2,"Name":"Practice 2","StartDate":"2026-09-24T16:00:00","EndDate":"2026-09-24T17:00:00","GmtOffset":"04:00:00","Path":"2026/2026-09-26_Azerbaijan_Grand_Prix/2026-09-24_Practice_2/","_kf":true},"TrackStatus":{"Status":"1","Message":"AllClear","_kf":true},"WeatherData":{"AirTemp":"29.1","Humidity":"54.2","Pressure":"1014.8","Rainfall":"0","TrackTemp":"42.3","WindDirection":"243","WindSpeed":"1.2","_kf":true}}}\u001e',
  feed: '{"type":1,"target":"feed","arguments":["TimingData",{"Lines":{"10":{"Sectors":{"2":{"Segments":{"0":{"Status":2048}}}}}}},"2026-09-24T12:54:39.455Z"]}\u001e',
  feedBatch:
    '{"type":1,"target":"feed","arguments":["TimingData",{"Lines":{"30":{"NumberOfLaps":20,"Sectors":{"2":{"Value":"25.197"}},"Speeds":{"FL":{"Value":"318"}},"LastLapTime":{"Value":"1:50.132"}}}},"2026-09-24T12:54:41.643Z"]}\u001e{"type":1,"target":"feed","arguments":["TimingAppData",{"Lines":{"30":{"Stints":{"2":{"LapTime":"1:50.132","LapNumber":20}}}}},"2026-09-24T12:54:41.643Z"]}\u001e',
  ping: '{"type":6}\u001e',
};
