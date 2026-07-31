# Frame-End Releases

Released DOFs are eliminated by the exact Schur complement. For retained `r` and released `q`, `Kc=Krr-Krq Kqq⁻¹Kqr` and `pc=pr-Krq Kqq⁻¹pq`. A non-positive or scale-small pivot in `Kqq` is an `ELEMENT_LOCAL_MECHANISM`; no artificial stiffness is inserted. Released displacements are recovered from `uq=Kqq⁻¹(pq-Kqrur)` before end-force recovery.
