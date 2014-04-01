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
	for(var o in options){opt[o]=options[o];};

	gh=new Github({auth:'oauth',token:'b93365cb0876e6bf85728f3a10e2bab3384d428a'});//give personal access to repo, well repo is public anyways
	repo=gh.getRepo('whoisterencelee','wordsharer.com');
	C=document.getElementById('content');
	var CC=C.cloneNode();//borrow node C's innerHTML to be repeatly used in repairHTML
	W=words;
	U='.//'+W;// allows offline file load

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

function buildTimeline(tags){
	//grab all time from all ins/del tags
	var I=C.getElementsByTagName('ins');
	var NS=I.length,P=[];

	while(--NS){
		var INS=I[NS];
		var DT=INS.dateTime;
		if(typeof DT=='undefined' && !DT.isDate() )continue;
		do{
			var PINS=INS.parentNode;
			var TPINS=PINS.tagName;
			if( TPINS == "p" ){ INS=PINS; break; };
		}while(!( /UL|OL/.test(TPINS) || PINS==C ));
		P.push([DT,INS]);
	}
	P.sort();
	return P;
}

function errorlog(heading,details){
	var s="ERROR: "+heading+" : "+details;
	console.log(s);
	return s;
}
