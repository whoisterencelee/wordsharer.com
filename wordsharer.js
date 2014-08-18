// wordsharer.js - speedy, concise, propagate. Frictionless idea sharing powered by GitHub.
// Copyright (c) 2014, Terence Lee
// https://github.com/whoisterencelee/wordsharer.com.git

// requires:
// marked.js		https://github.com/chjj/marked.git
// github.js		https://github.com/whoisterencelee/github.git (whoisterencelee branch)
//  underscore.js
//  base64.js
// htmlDiff		https://github.com/whoisterencelee/htmlDiff.git (whoisterencelee branch)
//  google-diff-match-patch
// aes.js		https://code.google.com/p/crypto-js/	

function wordsharer(words,options){
	opt={repairHTML:1,encrypt:false};// defaults
	for(var o in options){if(options.hasOwnProperty(o))opt[o]=options[o];};

	C=document.getElementById('content');
	var CC=C.cloneNode();//borrow node C's innerHTML to be repeatly used in repairHTML

	if(typeof words=='string'){
		var urlquery=window.location.search;
		urlquery="?words="+words+urlquery.replace(/[\?&]words=[^&]+/,'');// put words in front
		history.pushState(null,null,urlquery);
	} else words=getParameterByName("words"); // get from url
	if(words==null || words.length==0){newWords();return;};
	document.title=words;
	W=words+'.md';

	offline=getParameterByName("offline");
	if(offline!=null)W='.//'+W;// allows offline file load

	opt.encrypt=getParameterByName("encrypt")=='true'?true:opt.encrypt;

	var token=getParameterByName("token");
	if(typeof token=="string" && offline==null) var gh=new Github({auth:'oauth',token:token});// set write access to repo
	else{
		var gh=new Github({});
		getWords=function(W, cb, C){
			repo.req('GET',".//"+W,null,function(e,text){ // borrow github.js' XMLrequest
				if(e){C.innerHTML=errorlog("Unable to load "+W,e);return;}
				if(opt.encrypt)text=CryptoJS.AES.decrypt(text,prompt("Password:")).toString(CryptoJS.enc.Utf8);
				repairHTML(text,C);
				cb(e,text);
				},'raw');
				if(!offline)C.contentEditable=false; // readonly
			};
		document.getElementById('submitWords').disabled=true;
	};
		
	repo=gh.getRepo('whoisterencelee','wordsharer.com');

	con=document.getElementById('console');

	D=new htmlDiff;
	D.clearHash();  // needed, initialize html tag hash stores

	if(opt.repairHTML==0){ //no repair
		repairHTML=function(html,node){
			if(typeof node=='object')node.innerHTML=html;// for display only
			return html; // return html flavor based on escaped HTML output
		};
	}else if(opt.repairHTML==1){ //use browser html parser/renderer
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
		if(e){
			content="<p></p>";
			repairHTML("<p>creating a whole new word</p>",C);
		}
		STAGED=content;
		buildTimeline();
		whenWords();

		// run once after timeline to move datetime to newest so next sharee will see what you changed
		var datetimeregexp=/&datetime=[^&]+/;

		var urlquery=window.location.search;
		if(!datetimeregexp.test(urlquery))urlquery=urlquery.replace(/(&)|$/,function(a){return "&datetime="+timeline[timeline.length-1]+a;});
		else urlquery=urlquery.replace(datetimeregexp,"&datetime="+timeline[timeline.length-1]);
		try{
			history.pushState(null,null,urlquery);
		}catch(e){}

		// TODO use browser history to implement timeline change, but this just makes things complicated...

		C.focus();

		var range=document.createRange()
		range.selectNodeContents(C.childNodes[0]);
		var selection=document.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);

		if(content!="<p></p>")selection.collapseToStart();
	}, C);

}

function getParameterByName(name) {
	var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
	return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
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
		var text=Base64.decode(fileobj.content);
		if(opt.encrypt)text=CryptoJS.AES.decrypt(text,prompt("Password:")).toString(CryptoJS.enc.Utf8);
		marked(text,function(e,markup){// put md thur markdown, because we are only working with HTML
				if(e){return cb(errorlog("getWords","marked crash on parsing "+file),STAGED);}
				cb(pulled,repairHTML(markup,display));
		});
	}, false, 'json');

}

function mergeWords(cb){

	// 2.5 way merge, there is only append no delete
	// we can merge and not submit to provide preview

	C.contentEditable=false;// lock up, when ever we are going to modify C, otherwise the user might see their modification disappear

	// first diff last STAGED with modified to mark what's changed with <ins> <del> and re-instate deleted text
	STAGED=repairHTML(D.diff(STAGED,C.innerHTML),C);
	
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

}

MAXRETRIES=4;

function submitWords(retries){
	if(typeof retries!='number')retries=MAXRETRIES;
	else if(retries<1){alert("unable to submit words try again later");return;}

	PREMARKEDIT="";
	document.getElementById('markeditbutton').textContent="markedit";

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

		if(offline===null || typeof offline=='undefined'){
			if(opt.encrypt)newwords=CryptoJS.AES.encrypt(newwords,setpassWord()).toString();
			repo.contents_update("gh-pages", W, message, newwords, DOCSHA, function(e,resp){
				if(e)return submitWords(--retries);
				DOCSHA=resp.content.sha;
				buildTimeline();
				whenWords();
			});
		}

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

var timeline=[],timecss={};

function buildTimeline(tags){
	if(typeof tags=="string")tags=tags.split(",");
	else tags=['ins','del'];
	
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
				timecssrules[TagName]=TagName+'[datetime="'+DTA+'"]'; //add CSS style properties in whenWords
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

function whenWords(){
	//build stylesheet base on time relative to timeline
	//buildTimeline('ins,del');// have to have ran
	var back=timeline.length,lasttime=back-1,past=lasttime;
	if(back<1)return;

	var time=getParameterByName("datetime");
	if(typeof time!='string')time=timeline[back-1];// highlight no updates, but build url later

	var csssheet=document.getElementById('wordsharerstyle');
	if(!csssheet){ alert('wordsharerstyle style element missing, no highlights will be shown');return; }

	var alltimerules='';
	while(back--){
		var timeentry=timeline[back];
		var timecssrules=timecss[timeentry]
		for(var TagName in timecssrules){
			if(!timecssrules.hasOwnProperty(TagName))continue;

			if(time >= timeentry){
				if(TagName=='del')alltimerules+=timecssrules[TagName]+'{display:none;} ';
			}else{
				if(TagName=='del')alltimerules+=timecssrules[TagName]+'{background:lightgrey;} ';
				else alltimerules+=timecssrules[TagName]+'{background:orange;} ';
				past=back;
			}
		}
	};

	if(past<lasttime){
		con.innerHTML="<li>"+(lasttime-past)+" updates</li>";
	}

	// CSS rules for different time related tags
	// see http://davidwalsh.name/add-rules-stylesheets
	if(typeof timerule=='number')csssheet.sheet.deleteRule(timerule);

	// one shot insert into wordsharerstyle sheet
	timerule=csssheet.sheet.insertRule("@media all { "+alltimerules+" }",0);

}

var mark=null;

function markWords(evt){// set to trigger onmouseup and onkeyup, finds out last text position
	var justmark=document.getSelection();
	var seafloor=justmark.anchorNode.parentNode;
	while(seafloor!=C){
		if(seafloor.className=='notes')return;// prevent comment comment
		seafloor=seafloor.parentNode;
		if(!seafloor)return;// prevent outside selection
	};
	mark={anchorNode:justmark.anchorNode,anchorOffset:justmark.anchorOffset,data:justmark.anchorNode.data};// manually clone getSelection object
//	con.innerHTML="<li>"+markstart[0].data+"</li>";//debug
};

function annotateWords(){// set to trigger onclick in some area outside of content
	// no need datetime as ins will take care of this
        // require css: span.notes{position:absolute;left:80%;z-index:1;} span.notes span{outline-style:none;}
	// need to define the left position during wordsharer load and set the annotation section left parameter

	if(!mark)return;
	var anchor=mark.anchorNode;
	if(!anchor)return;
	var seafloor=anchor.parentNode;
	if(!seafloor)return;

	//con.innerHTML="<li>"+anchor.data+"</li>";// debug

	// create comment DOM, can't insert using innerHTML, use DOM model
	// don't use div i.e. <p><span><div></div></span></p> since the repairHTML does not allow div inside p
	// so it becomes <p><span></span></p><div></div> which is wrong, so don't use div
	// dont' use p within p as well, <p><p></p></p> doesn't work
	
	var comment=document.createElement("span");
	comment.contentEditable=true;// not contenteditable Upper Case E counts
	comment.textContent="Please enter your comment here";

	// need double span because absolute positioning with contentEditable gives a draggable/resizable box which we don't want
	var commentbox=document.createElement("span");
	commentbox.contentEditable=false;
	commentbox.className="notes";
	commentbox.appendChild(comment);

	// mark spot
	var markspot=document.createElement("span");
	markspot.className="mark";
	markspot.appendChild(commentbox);

	// a mark line can be created with an additional span using border-top/left, set position abs and width instead of left
	// but width can change, so not yet workable

	var offset=mark.anchorOffset;
	var text=anchor.data;
	if(text){
		//try to insert at end of word
		var end=text.length;
		while(offset<end){if(text[offset]==" ")break;offset++;};
		seafloor.insertBefore(document.createTextNode(text.slice(0,offset)),anchor);
		seafloor.insertBefore(markspot,anchor);
		seafloor.replaceChild(document.createTextNode(text.slice(offset)),anchor);
	}else{
		seafloor=anchor;
		anchor=anchor.childNodes[0];
		if(!anchor)anchor=null;
		seafloor.insertBefore(markspot,anchor);
	};

	// all that dom work just for this
	// select the comment text now, if more complicated range selection is needed use http://code.google.com/p/rangy/
	var range, selection;
	if (document.body.createTextRange) {
		range = document.body.createTextRange();
		range.moveToElementText(comment);
		range.select();
	} else if (window.getSelection) {
		selection = window.getSelection();
		range = document.createRange();
		range.selectNodeContents(comment);
		selection.removeAllRanges();
		selection.addRange(range);
	}
	comment.focus();

	// undo if no comment entered
	comment.onblur=function(){
		if(/^Please enter your comment here/.test(comment.textContent))seafloor.removeChild(markspot);
		// no need to recombine TextNodes, they are recombined automatically
	};

	// still need to figure out how to handle overlapping notes

	return;
}

PREMARKEDIT="";

function markeditWords(){
	if(PREMARKEDIT==""){
		PREMARKEDIT=C.innerHTML;
		repairHTML(markedit(PREMARKEDIT),C);
		buildTimeline();
		whenWords();
		document.getElementById('markeditbutton').textContent="unmarkedit";
	}else{
		C.innerHTML=PREMARKEDIT;
		PREMARKEDIT="";
		buildTimeline();
		whenWords();
		document.getElementById('markeditbutton').textContent="markedit";
	}
}

var showhint=true;
function helpWords(){
	var hints=document.getElementsByClassName("hint");
	var show=hints.length;
	while(show--){
		hints[show].style.display=showhint?"block":"none";
	}
	showhint=!showhint;
}

function newWords(){

	var token=getParameterByName("token");
	if(token==null){
		token=prompt('Need write access token to create new words');
		if(token==null)alert("The words will be readonly");
		else history.pushState(null,null,window.location.search+"&token="+token);
	};

	var newWordsinput=document.getElementById("newWordsinput");

	var words=getParameterByName("words");
	newWordsinput.value=words?words[1]:"why";
	newWordsinput.style.display="block";
	newWordsinput.focus();
	newWordsinput.select();
}

function overrideWords(){
	var message="override words to "+W;

	if(offline===null || typeof offline=='undefined'){
		var overwords=C.innerHTML;
		if(opt.encrypt)overwords=CryptoJS.AES.encrypt(overwords,setpassWord()).toString();
		repo.contents_update("gh-pages", W, message, overwords, DOCSHA, function(e,resp){
			if(e)return alert("content has been modified someone else, override not allowed, use submit instead");
			DOCSHA=resp.content.sha;
			buildTimeline();
			whenWords();
		});
	}
}

function publishWords(){
	//TODO should sanitize C.innerHTML first
	var validhtml="<!DOCTYPE html><html><head></head>"+C.innerHTML+"</html>";
	repo.write('gh-pages','why-published.html',validhtml,"publish "+W+" to "+W+".html using wordsharer",function(){});
}

function commentWords(mark){
	// similar to annotateWords 
	// load a separate comment file which has a list of datetime/marks/comments that gets inserted into the content (which has contenteditable become false)
	// the comment file can even sit on another repo for better access control
}

function setpassWord(){
	var pass1="hi",pass2="bye";
	while(pass1!=pass2){
		pass1=prompt("Password:");
		pass2=prompt("Reconfirm Password:");
	};
	return pass1;
}

function errorlog(heading,details){
	var s="ERROR: "+heading+" : "+details;
	console.log(s);
	return s;
}
