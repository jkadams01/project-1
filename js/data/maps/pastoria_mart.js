PKM.registerMap('pastoria_mart', {
 "name": "Pastoria Poke Mart",
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
  "poke-ball",
  "great-ball",
  "potion",
  "super-potion",
  "antidote",
  "paralyze-heal",
  "awakening",
  "burn-heal",
  "ice-heal",
  "full-heal",
  "repel",
  "super-repel",
  "escape-rope",
  "revive",
  "net-ball",
  "hyper-potion"
 ],
 "warps": [
  {
   "x": 6,
   "y": 8,
   "to": "pastoria",
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
