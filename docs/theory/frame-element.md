# Three-Dimensional Frame Element

Local DOFs are `[u,v,w,rx,ry,rz]` at the start followed by the same six at the end. Axial and Saint-Venant torsional terms are `EA/L` and `GJ/L`. Bending in local `y` uses `EIz`; bending in local `z` uses `EIy` with the right-hand sign convention for `ry`.

For Timoshenko bending, `φy=12EIz/(GAsyL²)` and `φz=12EIy/(GAszL²)`. Each bending block uses `12EI/(L³(1+φ))`, `6EI/(L²(1+φ))`, `(4+φ)EI/(L(1+φ))`, and `(2-φ)EI/(L(1+φ))`.
