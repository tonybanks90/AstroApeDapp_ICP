import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";

module {
    public type FileReference = {
        path : Text;
        hash : Text;
    };

    public type Registry = {
        var references : OrderedMap.Map<Text, FileReference>;
    };

    public func new() : Registry {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        let references = pathMap.empty<FileReference>();
        {
            var references;
        };
    };

    public func add(registry : Registry, path : Text, hash : Text) {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        let fileReference = { path; hash };
        registry.references := pathMap.put(registry.references, path, fileReference);
    };

    public func get(registry : Registry, path : Text) : FileReference {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        switch (pathMap.get(registry.references, path)) {
            case null Debug.trap("Inexistent file reference");
            case (?fileReference) fileReference;
        };
    };

    public func list(registry : Registry) : [FileReference] {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        Iter.toArray(pathMap.vals(registry.references));
    };

    public func remove(registry : Registry, path : Text) {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        registry.references := pathMap.remove(registry.references, path).0;
    };
};
