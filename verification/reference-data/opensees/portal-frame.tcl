wipe
model BasicBuilder -ndm 3 -ndf 6

# Single-bay portal: 5 m span, 3 m height. Bases fixed. SI units (m, N).
node 1 0 0 0
node 2 0 3 0
node 3 5 3 0
node 4 5 0 0
fix 1 1 1 1 1 1 1
fix 4 1 1 1 1 1 1
fix 2 0 0 0 0 0 0
fix 3 0 0 0 0 0 0

# Columns are vertical (local x along Y): vecxz 1 0 0. Beam along X: vecxz 0 1 0.
geomTransf Linear 1 1 0 0
geomTransf Linear 2 0 1 0
# Column section c: A 0.018, E 200e9, G 76.923e9, J 7e-6, Iy 9e-6, Iz 15e-6
# Beam section b: A 0.015, E 200e9, G 76.923e9, J 6e-6, Iy 7e-6, Iz 12e-6
element elasticBeamColumn 1 1 2 0.018 200.0e9 76.92307692307692e9 7.0e-6 9.0e-6 15.0e-6 1
element elasticBeamColumn 2 2 3 0.015 200.0e9 76.92307692307692e9 6.0e-6 7.0e-6 12.0e-6 2
element elasticBeamColumn 3 4 3 0.018 200.0e9 76.92307692307692e9 7.0e-6 9.0e-6 15.0e-6 1

timeSeries Linear 1
pattern Plain 1 1 {
  load 3 2000 -5000 0 0 0 0
}

constraints Transformation
numberer RCM
system BandGeneral
test NormDispIncr 1e-12 10 0
algorithm Linear
integrator LoadControl 1
analysis Static
if { [analyze 1] != 0 } {
  error "OpenSees portal-frame analysis failed"
}

foreach n {1 2 3 4} {
  set d [list [nodeDisp $n 1] [nodeDisp $n 2] [nodeDisp $n 3] [nodeDisp $n 4] [nodeDisp $n 5] [nodeDisp $n 6]]
  set r [list [nodeReaction $n 1] [nodeReaction $n 2] [nodeReaction $n 3] [nodeReaction $n 4] [nodeReaction $n 5] [nodeReaction $n 6]]
  puts "XFRAME node $n disp $d react $r"
}
foreach e {1 2 3} {
  puts "XFRAME frame $e forces [eleResponse $e localForces]"
}
