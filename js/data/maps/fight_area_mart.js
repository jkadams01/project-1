PKM.registerMap('fight_area_mart', {
 "name": "Fight Area Poke Mart",
 "theme": "mart",
 "music": "center",
 "indoor": true,
 "tiles": [
  "##############",
  "#..##....##..#",
  "#............#",
  "#..##....##..#",
  "#............#",
  "#............#",
  "#............#",
  "#............#",
  "######D#######"
 ],
 "shop": [
  "great-ball",
  "ultra-ball",
  "quick-ball",
  "dusk-ball",
  "timer-ball",
  "net-ball",
  "super-potion",
  "hyper-potion",
  "max-potion",
  "full-restore",
  "full-heal",
  "revive",
  "max-repel",
  "escape-rope",
  "max-revive",
  "elixir"
 ],
 "warps": [
  {
   "x": 6,
   "y": 8,
   "to": "fight_area",
   "tx": 18,
   "ty": 5,
   "dir": "down"
  }
 ],
 "signs": [],
 "npcs": [
  {
   "id": "clerk",
   "x": 2,
   "y": 6,
   "sprite": "clerk",
   "dir": "right",
   "move": "static",
   "script": "shop_here"
  }
 ]
});
