wipe
model BasicBuilder -ndm 3 -ndf 6

# Two-story two-bay moment frame: 4 m bays, 3 m stories. Bases fixed. SI units (m, N).
node 1 0 0 0
node 2 4 0 0
node 3 8 0 0
node 4 0 3 0
node 5 4 3 0
node 6 8 3 0
node 7 0 6 0
node 8 4 6 0
node 9 8 6 0
fix 1 1 1 1 1 1 1
fix 2 1 1 1 1 1 1
fix 3 1 1 1 1 1 1
foreach n {4 5 6 7 8 9} { fix $n 0 0 0 0 0 0 }

# vecxz 0 0 1 aligns both member directions with the xframe model, exactly as
# in portal-frame.tcl: in-plane (global XY) bending uses Iz in both codes.
geomTransf Linear 1 0 0 1
# Column section c / beam section b mirror the xframe reference model.
element elasticBeamColumn 1 1 4 0.022 200.0e9 76.92307692307692e9 9.0e-6 12.0e-6 22.0e-6 1
element elasticBeamColumn 2 2 5 0.022 200.0e9 76.92307692307692e9 9.0e-6 12.0e-6 22.0e-6 1
element elasticBeamColumn 3 3 6 0.022 200.0e9 76.92307692307692e9 9.0e-6 12.0e-6 22.0e-6 1
element elasticBeamColumn 4 4 7 0.022 200.0e9 76.92307692307692e9 9.0e-6 12.0e-6 22.0e-6 1
element elasticBeamColumn 5 5 8 0.022 200.0e9 76.92307692307692e9 9.0e-6 12.0e-6 22.0e-6 1
element elasticBeamColumn 6 6 9 0.022 200.0e9 76.92307692307692e9 9.0e-6 12.0e-6 22.0e-6 1
element elasticBeamColumn 7 4 5 0.017 200.0e9 76.92307692307692e9 7.0e-6 8.5e-6 16.0e-6 1
element elasticBeamColumn 8 5 6 0.017 200.0e9 76.92307692307692e9 7.0e-6 8.5e-6 16.0e-6 1
element elasticBeamColumn 9 7 8 0.017 200.0e9 76.92307692307692e9 7.0e-6 8.5e-6 16.0e-6 1
element elasticBeamColumn 10 8 9 0.017 200.0e9 76.92307692307692e9 7.0e-6 8.5e-6 16.0e-6 1

timeSeries Linear 1
pattern Plain 1 1 {
  load 7 3000 0 0 0 0 0
  load 8 3000 0 0 0 0 0
  load 9 3000 0 0 0 0 0
}

constraints Transformation
numberer RCM
system BandGeneral
test NormDispIncr 1e-12 10 0
algorithm Linear
integrator LoadControl 1
analysis Static
if { [analyze 1] != 0 } {
  error "OpenSees two-story-two-bay analysis failed"
}
reactions

foreach n {1 2 3 4 5 6 7 8 9} {
  set d [list [nodeDisp $n 1] [nodeDisp $n 2] [nodeDisp $n 3] [nodeDisp $n 4] [nodeDisp $n 5] [nodeDisp $n 6]]
  set r [list [nodeReaction $n 1] [nodeReaction $n 2] [nodeReaction $n 3] [nodeReaction $n 4] [nodeReaction $n 5] [nodeReaction $n 6]]
  puts "XFRAME node $n disp $d react $r"
}
foreach e {1 2 3 4 5 6 7 8 9 10} {
  puts "XFRAME frame $e forces [eleResponse $e localForces]"
}
