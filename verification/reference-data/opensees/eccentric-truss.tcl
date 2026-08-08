wipe
model BasicBuilder -ndm 3 -ndf 6

# Reference nodes A/B and elastic truss ends EA/EB.
node 1 0 0 0
node 2 1 0 0
node 3 0 1 0
node 4 1 1 0
node 5 0 0 0
node 6 1 0 0

# Only rz is free at each reference node.
fix 1 1 1 1 1 1 0
fix 2 1 1 1 1 1 0
fix 5 1 1 1 1 1 1
fix 6 1 1 1 1 1 1

# Rigid arms transfer each reference-node rotation to its elastic truss end.
rigidLink beam 1 3
rigidLink beam 2 4

uniaxialMaterial Elastic 1 1000
element truss 1 3 4 1 1
uniaxialMaterial Elastic 2 1000
element zeroLength 2 1 5 -mat 2 -dir 6
element zeroLength 3 2 6 -mat 2 -dir 6

timeSeries Linear 1
pattern Plain 1 1 {
  load 1 0 0 0 0 0 1000
}

constraints Transformation
numberer RCM
system BandGeneral
test NormDispIncr 1e-12 10 0
algorithm Linear
integrator LoadControl 1
analysis Static
if { [analyze 1] != 0 } {
  error "OpenSees eccentric-truss analysis failed"
}

set thetaA [nodeDisp 1 6]
set thetaB [nodeDisp 2 6]
set axialForce [lindex [eleResponse 1 axialForce] 0]
puts "XFRAME thetaA $thetaA thetaB $thetaB axialForceMagnitude [expr {abs($axialForce)}]"
