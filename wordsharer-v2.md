## Editor

Looks like [Prose](Prose.io "Prose") already has most of the features I want to create for the editor + content management.

It's using [CodeMirror](CodeMirror.net "CodeMirror") editor which is fast and already well developed.

Let's integrate Prose into wordsharer and work on the 'propagation' mandate.

Here are some features which should be added to prose to make it a wordsharer editor
- [ ] annotation
  - [ ] create markdown sytnax // for annotations //
  - [ ] use marktext method to create annotation mark
    - [ ] use widget (not gutter) to add annotation bubble
      - addwidget can give precise location
        - [ ] make the widget above line and have a small logo
      - linewidget allow longer annotation that doesn't block
- [ ] update highlight
  - prose has a showdiff method which is used to show changes before commit
  - [ ] borrow this and allow showing diffs between commits
  - [ ] find out the last commit of this user as the original text
  
## Propagation


