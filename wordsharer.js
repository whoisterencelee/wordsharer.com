var gh=new Github({auth:'oauth',token:'b93365cb0876e6bf85728f3a10e2bab3384d428a'});//give personal access to repo, well repo is public anyways
var repo=gh.getRepo('whoisterencelee','wordsharer.com');

function save(){
	repo.write('gh-pages','why.md',C.innerHTML,"commit changes to why.md",function(err){console.log(err)});
}
