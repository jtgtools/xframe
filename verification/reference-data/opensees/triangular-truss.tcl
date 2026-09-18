wipe
model BasicBuilder -ndm 3 -ndf 3

# Triangular truss: 4 m base, 3 m apex. Node 2 has 1 mm prescribed tx. SI units (m, N).
node 1 0 0 0
node 2 4 0 0
node 3 2 3 0
fix 1 1 1 1
fix 2 0 1 1
fix 3 0 0 1

uniaxialMaterial Elastic 1 200.0e9
element truss 1 1 2 0.01 1
element truss 2 1 3 0.01 1
element truss 3 2 3 0.01 1

timeSeries Linear 1
pattern Plain 1 1 {
  sp 2 1 0.001
  load 3 1000 -5000 0
}

constraints Transformation
numberer RCM
system BandGeneral
test NormDispIncr 1e-12 10 0
algorithm Linear
integrator LoadControl 1
analysis Static
if { [analyze 1] != 0 } {
  error "OpenSees triangular-truss analysis failed"
}

foreach n {1 2 3} {
  set d [list [nodeDisp $n 1] [nodeDisp $n 2] [nodeDisp $n 3]]
  puts "XFRAME node $n disp $d"
}
foreach e {1 2 3} {
  puts "XFRAME truss $e axial [lindex [eleResponse $e axialForce] 0]"
}
