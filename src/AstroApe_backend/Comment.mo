import Array "mo:base/Array";

actor CommentSection {
    var comments : [Comment] = [];

    public func addComment(content: Text, gif_url: ?Text) : async () {
        let new_comment = {
            content = content;
            gif_url = gif_url;
            timestamp = Time.now();
        };
        comments := Array.append(comments, [new_comment]);
    };

    public func getComments() : async [Comment] {
        return comments;
    };
};
