# Windown version survey

A simple app which takes an input list of computer names and then writes out a CSV file detailing their corresponding Windows version numbers.

This uses `reg` to query the remote registry of each computer in the list.

If remote registry is disabled on the target computer, `sc` is automatically employed to try to start the remote registry service.

You should have local admin rights on the target PC in order for this to work. This should be automatic if you are already logged in as a domain administrator, running this from within a Windows domain.

## Usage

`survey --list computers.txt --out versions.csv`

computers.txt should be a simple list of computer names, separated by newlines.
