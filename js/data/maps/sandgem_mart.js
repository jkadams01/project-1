PKM.registerMap('sandgem_mart', {
 "name": "Sandgem Poke Mart",
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
  "repel"
 ],
 "warps": [
  {
   "x": 6,
   "y": 8,
   "to": "sandgem",
   "tx": 22,
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
