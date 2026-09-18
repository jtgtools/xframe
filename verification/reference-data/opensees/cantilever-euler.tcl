wipe
model BasicBuilder -ndm 3 -ndf 6

# Cantilever: n1 fixed, n2 free. 3 m Euler-Bernoulli beam, SI units (m, N).
node 1 0 0 0
node 2 3 0 0
fix 1 1 1 1 1 1 1
fix 2 0 0 0 0 0 0

# vecxz 0 0 1 puts local y along global Y, matching the xframe
# orientation [0, 1, 0]: transverse-Y bending uses Iz in both codes.
geomTransf Linear 1 0 0 1
# A E G J Iy Iz mirror xframe section 0.01 / 200e9 / 76.923e9 / 1e-5 / 8e-6 / 6e-6
element elasticBeamColumn 1 1 2 0.01 200.0e9 76.92307692307692e9 1.0e-5 8.0e-6 6.0e-6 1

timeSeries Linear 1
pattern Plain 1 1 {
  load 2 0 -2000 0 0 0 -3000
}

constraints Transformation
numberer RCM
system BandGeneral
test NormDispIncr 1e-12 10 0
algorithm Linear
integrator LoadControl 1
analysis Static
if { [analyze 1] != 0 } {
  error "OpenSees cantilever-euler analysis failed"
}
reactions

foreach n {1 2} {
  set d [list [nodeDisp $n 1] [nodeDisp $n 2] [nodeDisp $n 3] [nodeDisp $n 4] [nodeDisp $n 5] [nodeDisp $n 6]]
  set r [list [nodeReaction $n 1] [nodeReaction $n 2] [nodeReaction $n 3] [nodeReaction $n 4] [nodeReaction $n 5] [nodeReaction $n 6]]
  puts "XFRAME node $n disp $d react $r"
}
puts "XFRAME frame 1 forces [eleResponse 1 localForces]"
