# Baku background art

Original offline Canvas artwork for the driving game. This is a compressed scenic composite of Baku Bay, not a georeferenced road reconstruction or a claim that all landmarks share one viewpoint.

## Visual research

- [Azerbaijan Tourism Board: Flame Towers](https://azerbaijan.travel/luxurious-trio-skyscrapers-flame-towers): the trio's elevated skyline position and views from the Seaside Boulevard/Highland Park. Interpreted as three differently curved, gridded blue-glass towers on a dry low hill.
- [UNESCO: Walled City of Baku](https://whc.unesco.org/en/list/958/): the Old City, Shirvanshahs' Palace and Maiden Tower ensemble. Interpreted as warm limestone walls, domes and a minaret; these are simplified skyline cues, not precise individual building replicas.
- [Icherisheher Reserve: Maiden Tower](https://icherisheher.gov.az/en/monuments/show/qiz-qalasi): broad stone cylinder, substantial height/diameter and upper stone bands. The artwork adds its characteristic projecting buttress and slit windows. Dating remains disputed, so no construction-date claim is embedded in the game.
- [Azerbaijan Tourism Board: Seaside Boulevard](https://azerbaijan.travel/feel-bakus-mediterranean-atmosphere-stroll-along-the-boulevard-19909): the waterfront park, bay, greenery, Carpet Museum and Baku Eye. Interpreted through water, tree crowns, promenade, paired lamps and a distant observation wheel.
- [Azerbaijan Tourism Board: Carpet Museum](https://azerbaijan.travel/visit-bakus-carpet-museum-cant-be-missed): rolled-carpet building form, reflected in the gold patterned roof and circular rolled end.
- [Azerbaijan Tourism Board: Boulevard boat trips](https://azerbaijan.travel/boat-trips-boulevard): passenger boats and a view back toward the city. A small white boat is used as a scale cue; no live timetable or pricing is represented.

Read on 2026-11-04. Reference photos/search images were used for visual orientation only, not copied or redistributed. All game artwork is original code, with no remote asset/font/runtime requests.

## Direction and implementation

Palette: Caspian blue #8aafb3, hazy sky #b8d1d9, limestone #d6c4a6, warm cornice #eee1c7, glass shadow #547986, boulevard greenery #879c7e. Existing UI typography and vehicle art are retained. The calm pale bay and darker detailed car separate the playfield from the skyline.

`src/baku-background.js` constructs two fixed 2400x330 in-memory atlases (about 6.0 MiB total RGBA backing storage), once per page load. Far city/hills move at 0.012 camera distance, the detailed city at 0.038, and the near promenade at 0.16. The skyline wraps over a wide composite; lamps use a full two-bay repeat period so their alternating positions do not jump at a single-bay boundary. Sky/water accents are lightweight Canvas primitives. The background has no physics bodies and does not modify the track, suspension or tires.

At narrow widths the initial frame shifts toward the Flame Towers instead of leaving the principal landmark off-screen. Default desktop layout and driving were visually inspected; physical mobile hardware was not tested. Vertical skyline motion is limited to maintain a readable horizon during hill climbs. Some landmarks appear later along the parallax panorama, rather than all being crowded into the starting view.

A first visual pass revealed accidental strokes outside the glass towers caused by reusing the last clipped path; explicit Path2D silhouettes corrected them. Maiden Tower placement was moved left so the car does not hide it at the starting position. Former conifer/mountain scenery was replaced with the city and waterfront. Road colors were changed to dry limestone tones without changing collision geometry.
