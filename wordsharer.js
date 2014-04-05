// wordsharer.js - speedy, concise, propagate. Frictionless idea sharing powered by GitHub.
// Copyright (c) 2014, Terence Lee
// https://github.com/whoisterencelee/wordsharer.com.git

// requires:
// marked.js		https://github.com/chjj/marked.git
// github.js		https://github.com/whoisterencelee/github.git
//  underscore.js
//  base64.js
// htmlDiff		https://github.com/cosmiclattes/htmlDiff.git
//  google-diff-match-patch

function wordsharer(words,options){
	opt={repairHTML:1};// defaults
	for(var o in options){if(opt.hasOwnProperty(o))opt[o]=options[o];};

	gh=new Github({auth:'oauth',token:'b93365cb0876e6bf85728f3a10e2bab3384d428a'});//give personal access to repo, well repo is public anyways
	repo=gh.getRepo('whoisterencelee','wordsharer.com');
	C=document.getElementById('content');
	var CC=C.cloneNode();//borrow node C's innerHTML to be repeatly used in repairHTML
	W=words;
	U='.//'+W;// allows offline file load

	con=document.getElementById('console');

	D=new htmlDiff;
	D.clearHash();  // needed, initialize html tag hash stores

	if(opt.repairHTML==0){ //used marked repair only
		repairHTML=function(html,node){
			if(typeof node=='object')node.innerHTML=html;// for display only
			return html; // return html flavor based on escaped HTML output
		};
	}else if(opt.repairHTML==1){ //use browser innerHTML
		repairHTML=function(html,node){
			if(typeof node=='undefined')node=CC;
			node.innerHTML=html;// follow with innerHTML transform
			return node.innerHTML;// return html flavor based on displayable non-escaped html
		};
	}else{  //TODO use some sort of htmlParser and a stack to fix tag soup
		repairHTML=function(html,node){
			if(typeof node=='undefined')node=CC;
			node.innerHTML=html;// follow with innerHTML transform
			return node.innerHTML;// return html flavor based on displayable non-escaped html
		};
	};

	getWords(W, function(e,content){
		STAGED=content;
	}, C);

}

var DOCSHA="";
var STAGED="";

function getWords(file,cb,display){
	// this function can provide async so calling functions wont have to

	// getting content in one http request instead of three using lower level API
	// less flexible but faster, no need to track HEAD just DOCSHA (use when update)
	// not sure if this is faster if we only want to check sha
	// also response limited to 1M
	repo.contents("gh-pages",W,function(e,fileobj){
		if(e){return cb(errorlog("getWords","unable to get file object "+file+" from branch gh-pages"),STAGED);}
		var pulled=null;// tristate: (1) null (pulled) or (2) false (not pulled) or (3) true/string (error)
		var sha=fileobj.sha;
		if(sha==DOCSHA){pulled=false;return cb(pulled,STAGED);}
		DOCSHA=sha;
		marked(Base64.decode(fileobj.content),function(e,markup){// put md thur markdown, because we are only working with HTML
				if(e){return cb(errorlog("getWords","marked crash on parsing "+file),STAGED);}
				cb(pulled,repairHTML(markup,display));
		});
	}, false, 'json');

}

function mergeWords(cb){

	// 2.5 way merge, there is only append no delete
	// we can merge and not submit to provide preview

	C.contentEditable=false;// lock up, when ever we are going to modify C, otherwise the user might see their modification disappear

	//convert any markdown first
	marked(C.innerHTML,function(e,MODIFIED){
		if(e){
			C.contentEditable=true;// unlock
			alert("The edits you entered caused a problem during markdown->html conversion, operation aborted : "+e);
			return cb(e);
		}

		// first diff last STAGED with modified to mark what's changed with <ins> <del> and re-instate deleted text
		// need MODIFIED to go thur the same process as STAGED so it as close as possible before diff, 
		STAGED=repairHTML(D.diff(STAGED,repairHTML(MODIFIED)),C);
		
		// TODO modify htmlDIFF to fix overlaping tags after diffs e.g. <ins><li></li><li></li></ins> should be <ins><li></li></ins> <ins><li></li></ins>
		// TODO insert time modify attribute to all ins and del that doesn't already have this attribute

		//getWords and merge in
		getWords(W,function(pulled,REMOTE){
			var error=pulled;
			if(error){
				C.contentEditable=true;// unlock
				alert("ERROR: Cannot merge REMOTE in. "+error);
				return cb(error);
			}

			if(pulled===null)STAGED=repairHTML(D.diff(REMOTE,STAGED,{tagless:true}),C);
			// otherwise STAGED is already the latest
			// tagless so we won't get <ins><del></ins>, only merge text, the marks are already done

			if(typeof cb=='function')cb(pulled,STAGED);
			C.contentEditable=true;// unlock

		});

	});
}

MAXRETRIES=4;

function submitWords(retries){
	if(typeof retries=='undefined')retries=MAXRETRIES;

	// TODO fire and forget, user submit and even if there are new edits we try to save what's previously submitted
	// but things get complicated, for example, do you show remote updates once your fire and forget?
	// submit-merge-edit--------merge
	//         `-trying to save-merge
	// these final merges are different
	// to do this need to separate mergeWords into stageWords and mergeWords, 
	// if submit again, cancel previous non finished submit TODO implement queue

	// lock submit button
	// write commit message which is only generated once
	var message="submitted new words to "+W;

	mergeWords(function(e,newwords){

		repo.contents_update("gh-pages", W, message, newwords, DOCSHA, function(e,resp){
			if(e)return submitWords(--retries);
			DOCSHA=resp.content.sha;
		});

		/*
		repo.postBlob(newwords,function(e,blob){
			repo.updateTree(HEAD, W, blob, function(e,tree){
				repo.commit(HEAD, tree, message, function(e, head){
					repo.updateHead("gh-pages",commit, function(e){
						// this checks if you have fast-forward commit, and therefore if you actually can commit
						if(e)return submitWords(--retries);
						HEAD=head;
						return;
					});
				});
			});
		});
		*/
	});

	//OT version
	//diff the original md with current to get the client insert operation(s)
		//if content is removed, insert ~~strikeover~~ to convert to insert operation

	//grab the server insert operation from github, using something like git compare
		//save the current HEAD

	//transform the client insert operation and merge into the latest document
	//commit
		//if successful save the current HEAD
		//otherwise try from grab the 
}

function publishWords(){
	//TODO should sanitize C.innerHTML first
	var validhtml="<!DOCTYPE html><html><head></head>"+C.innerHTML+"</html>";
	repo.write('gh-pages','why-published.html',validhtml,"publish "+W+" to "+W+".html using wordsharer",function(){});
}

var timeline=[],timecss={};

function buildTimeline(tags){
	if(typeof tags=="string")tags=tags.split(",");
	
	for(var name in tags){
		if(!tags.hasOwnProperty(name))continue;
		var TagName=tags[name];
		var I=C.getElementsByTagName(TagName);
		var NS=I.length;

		// don't create class/inline style here, which would pollute the HTML, use CSS styling
		// use CSS select based on the datetime attribute

		while(NS--){
			var INS=I[NS];
			var DTA=INS.dateTime;
			if( typeof DTA != "string" || !(/\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ/.test(DTA)) )continue;// no datetime attribute for this tag

			var timecssrules=timecss[DTA];
			if(!timecssrules){
				timecssrules={};
				timecss[DTA]=timecssrules;
				timeline.push(DTA);
			};
			if(!timecssrules[TagName]){

				// CSS rules for different time related tags
				// see http://davidwalsh.name/add-rules-stylesheets
				if(TagName=='del')timecssrules.del='del[datetime="'+DTA+'"]{background:grey;} ';
				else timecssrules[TagName]=TagName+'[datetime="'+DTA+'"]{background:orange;} ';// ins and others
			};

			/*
			// had plans to do some cool styling with the tag's parent node e.g. modify border-right for <p><ins>...</ins></p>
			// but currently CSS doesn't support parent node selection, and we don't want to pollute the HTML so this is not easy
			// OR keep track of styling change and then remove the styling before merge, which would slow things up
			do{
				var PINS=INS.parentNode;
				var TPINS=PINS.tagName;
				if( TPINS == "p" ){ INS=PINS; break; };
			}while(!( /UL|OL/.test(TPINS) || PINS==C ));
			timeentry.push(INS);
			*/
		};
	};
	return timeline.sort();// timeline must go from oldest to newest
};

var timerule;

function whenWords(time){
	//build stylesheet base on time relative to timeline
	buildTimeline('ins,del,span');
	var back=timeline.length;
	var alltimerules='';

	var csssheet=document.getElementById('wordsharerstyle');
	if(!csssheet){ alert('wordsharerstyle style element missing');return; }

	while(back--){
		var timeentry=timeline[back];
		if(time > timeentry)break;

		var timecssrules=timecss[timeentry]
		for(var TagName in timecssrules){
			if(!timecssrules.hasOwnProperty(TagName))continue;

			alltimerules+=timecssrules[TagName];
		}
	};
	if(typeof timerule=='number')csssheet.sheet.deleteRule(timerule);

	// one shot insert into wordsharerstyle sheet
	timerule=csssheet.sheet.insertRule("@media all { "+alltimerules+" }",0);
}

var markstart=[null,0];

function markWords(evt){// set to trigger onclick and onkeyup, finds out last text position
	var mark=document.getSelection();
	markstart=[mark.anchorNode,mark.anchorOffset];
//	con.innerHTML="<li>"+markstart[0].data+"</li>";//debug
	return false;
};

function annotateWords(){// set to trigger onclick in some area outside of content
	// no need datetime as ins will take care of this
        // require css: span.notes{position:absolute;left:80%;z-index:1;} span.notes div{outline-style:none;}
	// need to define the left position during wordsharer load and set the annotation section left parameter

	var anchor=markstart[0];
	con.innerHTML="<li>"+anchor.data+"</li>";

	var notenode="<span class='notes' contenteditable='false'><div contenteditable='true'>Please enter your comment here</div></span>";

	var offset=markstart[1];
	if(!anchor)return;
	else if(anchor.nodeType==document.TEXT_NODE)anchor=anchor.parentNode;// mark in textnode
	else{// mark in node without textnode
		if(offset)anchor=anchor.children[offset-1];
		offset=0;
	}
	var innerHTML=anchor.innerHTML;
	anchor.innerHTML=innerHTML.slice(0,offset)+notenode+innerHTML.slice(offset);

	// how to handle overlapping notes
	return;
}

function errorlog(heading,details){
	var s="ERROR: "+heading+" : "+details;
	console.log(s);
	return s;
}
