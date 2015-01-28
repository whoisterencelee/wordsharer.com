## Editor

Looks like [Prose](Prose.io "Prose") already has most of the features I want to create for the editor + github content management. It's using [CodeMirror](CodeMirror.net "CodeMirror") editor which is fast and already well developed.

Let's integrate Prose into wordsharer and work on the 'propagation' mandate.

Here are some features which should be added to prose to make it a wordsharer editor
- [ ] ** edit notes **
  - mainly used to explain large deletion
  - should not appear in the final document because they are raw discussions
  - are only made within edit mode
  - [ ] create markdown sytnax // for edit notes //
- [ ] ** comments **
  - [ ] use marktext method to create comment mark in preview mode
    - [ ] use widget (not gutter) to add comment bubble
      - addwidget can give precise location
        - [ ] make the widget above line and have a small logo
      - linewidget allow longer annotation that doesn't block
- [ ] ** update highlight **
  - prose has a showdiff method which is used to show changes before commit
  - [ ] borrow this and allow showing diffs between commits
  - [ ] find out the last commit of this user as the original text
- [ ] vim keymap

## Propagation

Allow people to clone the word so they can make improvements or save into their personal library and which they can make their own annotations.

When people modify their version they can push it back to original sharer.

Let people save webpages into their library, so they are currating articles.  And let they have a one line summary for the article.

Let people share their words with whom they choose, like email.

Once a word is shared, any updates notifies sharees.

