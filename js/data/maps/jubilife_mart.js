PKM.registerMap('jubilife_mart', {
 "name": "Jubilife Poke Mart",
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
  "potion",
  "antidote",
  "paralyze-heal",
  "awakening",
  "burn-heal",
  "repel",
  "great-ball",
  "super-potion",
  "escape-rope"
 ],
 "warps": [
  {
   "x": 6,
   "y": 8,
   "to": "jubilife",
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
